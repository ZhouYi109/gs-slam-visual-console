import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { nanoid } from "nanoid";
import { fileURLToPath } from "node:url";
import { Client } from "ssh2";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type StreamStatus = "ready" | "missing" | "unknown";
type SourceKind = "rosbag" | "dataset" | "unknown";

interface SensorStreamSummary {
  name: string;
  count: number;
  frequencyHz: number | null;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  status: StreamStatus;
}

interface DatasetInspection {
  id: string;
  sourcePath: string;
  sourceKind: SourceKind;
  inspectedAt: string;
  image: SensorStreamSummary;
  imu: SensorStreamSummary;
  lidar: SensorStreamSummary;
  alignment: {
    sameStartTime: boolean | null;
    timeAligned: boolean | null;
    maxStartOffsetMs: number | null;
    maxNearestOffsetMs: number | null;
    note: string;
  };
  warnings: string[];
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"]);
const lidarExtensions = new Set([".pcd", ".ply", ".bin", ".las", ".laz"]);
const textExtensions = new Set([".csv", ".txt", ".log"]);

function emptyStream(name: string, status: StreamStatus = "missing"): SensorStreamSummary {
  return {
    name,
    count: 0,
    frequencyHz: null,
    firstTimestamp: null,
    lastTimestamp: null,
    status
  };
}

function maybeTimestampFromName(filePath: string): number | null {
  const base = path.basename(filePath, path.extname(filePath));
  const match = base.match(/\d{10,}(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const raw = Number(match[0]);
  if (!Number.isFinite(raw)) {
    return null;
  }
  if (raw > 1e17) return raw / 1e9;
  if (raw > 1e14) return raw / 1e6;
  if (raw > 1e11) return raw / 1e3;
  return raw;
}

function summarizeFiles(name: string, files: string[]): SensorStreamSummary {
  const timestamps = files.map(maybeTimestampFromName).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const firstTimestamp = timestamps[0] ?? null;
  const lastTimestamp = timestamps.at(-1) ?? null;
  const duration = firstTimestamp !== null && lastTimestamp !== null ? lastTimestamp - firstTimestamp : 0;
  const frequencyHz = duration > 0 && timestamps.length > 1 ? Number(((timestamps.length - 1) / duration).toFixed(2)) : null;

  return {
    name,
    count: files.length,
    frequencyHz,
    firstTimestamp,
    lastTimestamp,
    status: files.length > 0 ? "ready" : "missing"
  };
}

async function walkFiles(root: string, limit = 25000): Promise<string[]> {
  const result: string[] = [];
  const stack = [root];

  while (stack.length > 0 && result.length < limit) {
    const current = stack.pop() as string;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
      if (result.length >= limit) {
        break;
      }
    }
  }

  return result;
}

async function summarizeImu(files: string[]): Promise<SensorStreamSummary> {
  const imuFiles = files.filter((file) => {
    const lower = file.toLowerCase();
    return textExtensions.has(path.extname(lower)) && (lower.includes("imu") || lower.includes("inertial"));
  });

  if (imuFiles.length === 0) {
    return emptyStream("IMU");
  }

  const timestamps: number[] = [];
  for (const file of imuFiles.slice(0, 8)) {
    const raw = await fs.readFile(file, "utf8").catch(() => "");
    for (const line of raw.split(/\r?\n/).slice(0, 5000)) {
      const value = Number(line.trim().split(/[,\s]+/)[0]);
      if (Number.isFinite(value) && value > 0) {
        timestamps.push(value > 1e11 ? value / 1e9 : value);
      }
    }
  }

  timestamps.sort((a, b) => a - b);
  const firstTimestamp = timestamps[0] ?? null;
  const lastTimestamp = timestamps.at(-1) ?? null;
  const duration = firstTimestamp !== null && lastTimestamp !== null ? lastTimestamp - firstTimestamp : 0;

  return {
    name: "IMU",
    count: timestamps.length || imuFiles.length,
    frequencyHz: duration > 0 && timestamps.length > 1 ? Number(((timestamps.length - 1) / duration).toFixed(2)) : null,
    firstTimestamp,
    lastTimestamp,
    status: "ready"
  };
}

function summarizeAlignment(streams: SensorStreamSummary[]): DatasetInspection["alignment"] {
  const ready = streams.filter((stream) => stream.status === "ready" && stream.firstTimestamp !== null);
  if (ready.length < 2) {
    return {
      sameStartTime: null,
      timeAligned: null,
      maxStartOffsetMs: null,
      maxNearestOffsetMs: null,
      note: "At least two streams need timestamps before alignment can be judged."
    };
  }

  const starts = ready.map((stream) => stream.firstTimestamp as number);
  const maxStartOffsetMs = Math.round((Math.max(...starts) - Math.min(...starts)) * 1000);
  const timeAligned = maxStartOffsetMs <= 50;

  return {
    sameStartTime: maxStartOffsetMs === 0,
    timeAligned,
    maxStartOffsetMs,
    maxNearestOffsetMs: null,
    note: timeAligned ? "Stream start times are within 50 ms." : "Stream start times differ by more than 50 ms."
  };
}

async function inspectDataset(sourcePath: string): Promise<DatasetInspection> {
  const stat = await fs.stat(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();
  const warnings: string[] = [];

  if (stat.isFile() && [".bag", ".db3", ".mcap"].includes(ext)) {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/dataset/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath }),
      });
      if (response.ok) {
        return (await response.json()) as DatasetInspection;
      }
      warnings.push(`ROS bridge returned error: ${response.status} ${response.statusText}`);
    } catch (e) {
      warnings.push("ROS bridge is offline or unreachable. Please start the Python backend (uvicorn main:app --port 8000).");
    }

    const unknown = emptyStream("Image", "unknown");
    return {
      id: nanoid(),
      sourcePath,
      sourceKind: "rosbag",
      inspectedAt: new Date().toISOString(),
      image: unknown,
      imu: emptyStream("IMU", "unknown"),
      lidar: emptyStream("LiDAR", "unknown"),
      alignment: {
        sameStartTime: null,
        timeAligned: null,
        maxStartOffsetMs: null,
        maxNearestOffsetMs: null,
        note: "Install or connect a ROS parser service to inspect bag topics and timestamps."
      },
      warnings
    };
  }

  if (!stat.isDirectory()) {
    throw new Error("Please select a dataset folder or a rosbag/db3/mcap file.");
  }

  const files = await walkFiles(sourcePath);
  if (files.length >= 25000) {
    warnings.push("File scan reached the safety limit of 25,000 files. Counts may be truncated.");
  }

  const imageFiles = files.filter((file) => imageExtensions.has(path.extname(file).toLowerCase()));
  const lidarFiles = files.filter((file) => lidarExtensions.has(path.extname(file).toLowerCase()));
  const image = summarizeFiles("Image", imageFiles);
  const lidar = summarizeFiles("LiDAR", lidarFiles);
  const imu = await summarizeImu(files);

  return {
    id: nanoid(),
    sourcePath,
    sourceKind: "dataset",
    inspectedAt: new Date().toISOString(),
    image,
    imu,
    lidar,
    alignment: summarizeAlignment([image, imu, lidar]),
    warnings
  };
}

export async function createApiServer() {
  const api = express();
  api.use(cors());
  api.use(express.json({ limit: "2mb" }));

  api.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  api.post("/api/dataset/inspect", async (request, response, next) => {
    try {
      const sourcePath = String(request.body.sourcePath ?? "");
      if (!sourcePath) {
        response.status(400).send("sourcePath is required");
        return;
      }
      response.json(await inspectDataset(sourcePath));
    } catch (error) {
      next(error);
    }
  });

  api.post("/api/server/test_connection", async (request, response) => {
    const { host, port, username, password, endpoint } = request.body;

    const sshPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
      const conn = new Client();
      conn.on("ready", () => {
        conn.end();
        resolve({ success: true, message: "SSH Connection Succeeded." });
      }).on("error", (err) => {
        resolve({ success: false, message: `SSH Connection Failed: ${err.message}` });
      }).connect({
        host: String(host || ""),
        port: Number(port || 22),
        username: String(username || ""),
        password: String(password || ""),
        readyTimeout: 10000
      });
    });

    const apiPromise = (async () => {
      if (!endpoint) {
        return { success: false, message: "API endpoint is not provided." };
      }
      try {
        const fetchRes = await fetch(`${endpoint}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (fetchRes.ok) {
          const data = await fetchRes.json() as any;
          if (data && (data.ok || data.status === "success")) {
            return { success: true, message: "FastAPI ROS Bridge is online." };
          }
        }
        return { success: false, message: `FastAPI responded with status: ${fetchRes.status}` };
      } catch (e: any) {
        return { success: false, message: `FastAPI ROS Bridge is offline: ${e.message}` };
      }
    })();

    const [sshResult, apiResult] = await Promise.all([sshPromise, apiPromise]);

    response.json({
      ssh: sshResult,
      api: apiResult,
      success: sshResult.success && apiResult.success
    });
  });

  api.post("/api/server/export_bridge", async (request, response, next) => {
    try {
      const destPath = String(request.body.destPath ?? "");
      if (!destPath) {
        response.status(400).send("destPath is required");
        return;
      }

      const searchPaths = [
        path.join(__dirname, ".."), 
        process.resourcesPath, 
        process.cwd()
      ];

      let mainPySrc = "";
      let converterPySrc = "";
      let requirementsSrc = "";

      for (const p of searchPaths) {
        const m = path.join(p, "ros_bridge_server_final.py");
        const c = path.join(p, "ros_bridge/converter.py");
        const r = path.join(p, "ros_bridge/requirements.txt");

        try {
          await fs.access(m);
          await fs.access(c);
          await fs.access(r);
          mainPySrc = m;
          converterPySrc = c;
          requirementsSrc = r;
          break;
        } catch {}
      }

      if (!mainPySrc) {
        for (const p of searchPaths) {
          const m = path.join(p, "ros_bridge/main.py");
          const c = path.join(p, "ros_bridge/converter.py");
          const r = path.join(p, "ros_bridge/requirements.txt");

          try {
            await fs.access(m);
            await fs.access(c);
            await fs.access(r);
            mainPySrc = m;
            converterPySrc = c;
            requirementsSrc = r;
            break;
          } catch {}
        }
      }

      if (!mainPySrc) {
        throw new Error("Unable to locate server-side source files for export.");
      }

      await fs.mkdir(destPath, { recursive: true });
      await fs.copyFile(mainPySrc, path.join(destPath, "main.py"));
      await fs.copyFile(converterPySrc, path.join(destPath, "converter.py"));
      await fs.copyFile(requirementsSrc, path.join(destPath, "requirements.txt"));

      response.json({ success: true, message: "Successfully exported server files." });
    } catch (e) {
      next(e);
    }
  });

  api.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown server error";
    response.status(500).send(message);
  });

  api.post("/api/convert/bag_to_folder", async (request, response, next) => {
    try {
      const fetchResponse = await fetch("http://127.0.0.1:8000/api/convert/bag_to_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body)
      });
      if (fetchResponse.ok) {
        response.json(await fetchResponse.json());
      } else {
        response.status(fetchResponse.status).send(await fetchResponse.text());
      }
    } catch (e) {
      next(e);
    }
  });

  api.post("/api/convert/folder_to_bag", async (request, response, next) => {
    try {
      const fetchResponse = await fetch("http://127.0.0.1:8000/api/convert/folder_to_bag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body)
      });
      if (fetchResponse.ok) {
        response.json(await fetchResponse.json());
      } else {
        response.status(fetchResponse.status).send(await fetchResponse.text());
      }
    } catch (e) {
      next(e);
    }
  });

  const server = http.createServer(api);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to start local API server");
  }

  return {
    port: address.port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}
