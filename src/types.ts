export type SourceKind = "rosbag" | "dataset" | "unknown";

export interface SensorStreamSummary {
  name: string;
  count: number;
  frequencyHz: number | null;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  status: "ready" | "missing" | "unknown";
}

export interface AlignmentSummary {
  sameStartTime: boolean | null;
  timeAligned: boolean | null;
  maxStartOffsetMs: number | null;
  maxNearestOffsetMs: number | null;
  note: string;
}

export interface DatasetInspection {
  id: string;
  sourcePath: string;
  sourceKind: SourceKind;
  inspectedAt: string;
  image: SensorStreamSummary;
  imu: SensorStreamSummary;
  lidar: SensorStreamSummary;
  alignment: AlignmentSummary;
  warnings: string[];
}

export interface RunConfiguration {
  datasetPath: string;
  useGroundTruth: boolean;
  groundTruthPath: string;
  algorithmMode: "local" | "remote";
  remoteEndpoint: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
}

export interface TestConnectionRequest {
  host: string;
  port: number;
  username: string;
  password?: string;
  endpoint: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export interface TestConnectionResponse {
  ssh: TestConnectionResult;
  api: TestConnectionResult;
  success: boolean;
}

export interface ConvertBagToFolderRequest {
  sourcePath: string;
  outputPath: string;
  imageFormat: string;
  lidarFormat: string;
}

export interface ConvertFolderToBagRequest {
  sourcePath: string;
  outputPath: string;
}
