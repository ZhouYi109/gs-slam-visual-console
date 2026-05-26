import { useMemo, useState, useEffect } from "react";
import type React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Database,
  FileArchive,
  FileImage,
  FolderOpen,
  Gauge,
  GitCompare,
  Languages,
  Play,
  Radar,
  Route,
  Server,
  Settings2,
  Upload,
  StopCircle,
  RefreshCw,
  Info
} from "lucide-react";
import { inspectDataset, convertBagToFolder, convertFolderToBag, testConnection, exportBridge } from "./api";
import type { DatasetInspection, RunConfiguration, SensorStreamSummary } from "./types";

type Language = "zh" | "en";

const copy = {
  zh: {
    appName: "SLAM-3DGS控制台",
    subtitle: "轻量数据检查 · 算法启动配置 · 实时流式可视化",
    navPrepare: "数据准备",
    navInspect: "数据体检",
    navRun: "运行配置",
    language: "English",
    sourceTitle: "选择输入数据",
    sourceText: "支持选择数据集文件夹，或选择 rosbag / db3 / mcap 文件。文件夹模式会扫描图片、IMU 文本和点云帧。",
    chooseFolder: "选择数据集文件夹",
    chooseBag: "选择 rosbag 文件",
    inspect: "读取并分析",
    selected: "当前输入",
    notSelected: "尚未选择",
    inspectTitle: "数据统计",
    image: "图像",
    imu: "IMU",
    lidar: "激光点云",
    frames: "数量",
    frequency: "频率",
    firstTime: "开始时间",
    lastTime: "结束时间",
    unknown: "未知",
    missing: "未发现",
    ready: "已读取",
    alignment: "时间对齐检查",
    sameStart: "开始时间一致",
    aligned: "是否已时间对齐",
    maxStartOffset: "最大开始偏差",
    note: "说明",
    yes: "是",
    no: "否",
    pending: "待检查",
    runTitle: "算法运行配置",
    runText: "这里先完成运行前配置。下一阶段将进入实时可视化窗口，直接与核心算法对接。",
    compare: "启用对照实验",
    compareText: "选择真值轨迹后，系统会在全局轨迹窗口中以不同颜色同时绘制 SLAM 轨迹与真值参考轨迹。",
    chooseTruth: "选择真值轨迹",
    truthPath: "真值轨迹文件",
    localMode: "本机运行算法",
    remoteMode: "连接服务器运行",
    endpoint: "服务器地址",
    start: "开始运行工程",
    startDisabled: "请先在【数据准备】页面读取数据",
    warnings: "提示",
    selectedBag: "已选择 rosbag，当前版本会识别文件，但深度 topic 解析需要 ROS 解析桥。",
    loading: "正在分析数据...",
    error: "分析失败",
    architecture: "后续运行架构建议",
    localAdvice: "如果算法依赖 CUDA、ROS、PCL、LibTorch 或已有 catkin 工作区，本机封装适合单机演示和离线实验，但安装包会很重，环境兼容成本高。",
    remoteAdvice: "服务器模式更适合 3DGS-SLAM：桌面端负责选数据、可视化和控制，后端服务器负责 GPU/ROS 算法运行，并通过 WebSocket/HTTP 流式返回图像、点云、轨迹和日志。",
    hybridAdvice: "推荐使用混合架构：UI内建轻量化数据检查，通过 WebSocket 与本地或远程 API 桥接。具体技术路径请查阅 workspace 下生成的 analysis_results.md 可行性报告。",
    simTitle: "SLAM-3DGS 实时运行看板",
    simStatus: "运行状态",
    simStatusActive: "正在运行 (ACTIVE)",
    simStop: "停止运行",
    simStatsFrame: "已处理帧数",
    simStatsFps: "核心运行速率",
    simStatsTime: "已运行时间",
    simStatsDrift: "累计漂移量",
    viewCamera: "相机数据流 (Camera Stream)",
    viewLidar: "激光雷达点云 (LiDAR Point Cloud)",
    view3dgs: "实时高斯渲染 (3DGS Render View)",
    viewTrajectory: "三维全局轨迹 (Global Trajectory)",
    navConvert: "格式转换",
    convertTitle: "格式转换 (ROS Bag ↔ 可视化文件夹)",
    convertText: "在 ROS Bag 格式与可视化文件夹目录（包含图片文件夹、IMU数据CSV以及激光雷达点云）之间进行转换。",
    bagToFolder: "ROS Bag → 文件夹",
    folderToBag: "文件夹 → ROS Bag",
    selectSourceBag: "选择源 ROS Bag",
    selectSourceFolder: "选择源文件夹",
    outputPath: "转换结果存储路径",
    imageFormat: "导出图像格式",
    lidarFormat: "导出激光雷达格式",
    startConvert: "开始转换",
    converting: "正在转换...",
    convertSuccess: "转换成功！",
    convertFailed: "转换失败：",
    chooseOutputFolder: "选择输出文件夹",
    sshHost: "SSH 服务器 IP",
    sshPort: "SSH 端口号",
    sshUsername: "SSH 用户名",
    sshPassword: "SSH 密码",
    testConnectionBtn: "一键测试服务器连接",
    testingConnection: "正在测试连接...",
    testSuccess: "连接测试成功！SSH 登录及 FastAPI 服务均已就绪。",
    testFailed: "连接测试失败！",
    sshOk: "SSH 通信状态: 正常",
    sshError: "SSH 通信状态: 失败",
    apiOk: "FastAPI 桥接状态: 正常",
    apiError: "FastAPI 桥接状态: 失败",
    tunnelMode: "SSH 端口转发 (方法 A - 推荐)",
    customMode: "自定义公网地址 (方法 B)",
    tunnelHint: "请在您本地电脑的终端中运行以下命令以建立安全数据通道（保持终端开启）：",
    copyCommand: "复制隧道命令",
    commandCopied: "命令已复制！",
    historyTitle: "使用历史连接记录",
    historyPlaceholder: "选择历史服务器...",
    deploymentTutorial: "💡 远程部署与连接教程",
    deploymentTitle: "云服务器 (AutoDL) 部署与极速配置教程",
    closeGuide: "关闭教程",
    exportBridgeBtn: "一键导出服务器部署包",
    exportingBridge: "正在导出...",
    exportSuccess: "导出成功！请在 FileZilla 中将该目录下的 main.py, converter.py 和 requirements.txt 拖拽上传到服务器的 /root/ros_bridge/ 目录下。",
    readOfflineTab: "读取离线数据包",
    realtimeHardwareTab: "实时接收硬件数据",
    lidarConfigTitle: "激光雷达 (LiDAR) 配置",
    cameraConfigTitle: "相机 (Camera) 配置",
    imuConfigTitle: "惯性单元 (IMU) 配置",
    startHardwareBtn: "一键启动实时硬件采集",
    stopHardwareBtn: "停止硬件采集",
    hardwareStatusTitle: "硬件实时采集看板",
    sensorName: "传感器",
    sensorStatus: "状态",
    sensorHz: "采集频率 (Hz)",
    sensorTelemetry: "累计数据包/延迟",
    lidarIpLabel: "雷达 IP 地址",
    lidarPortLabel: "雷达 UDP 端口",
    lidarBrandLabel: "雷达品牌型号",
    cameraModeLabel: "相机连接模式",
    cameraInputLabel: "相机序号 / RTSP 网址",
    cameraResLabel: "分辨率/帧率",
    imuPortLabel: "IMU 串口号 (COM)",
    imuBaudLabel: "串口波特率 (Baud)",
  },
  en: {
    appName: "SLAM-3DGS Console",
    subtitle: "Lightweight inspection · Configuration · Real-time streaming visualization",
    navPrepare: "Data Setup",
    navInspect: "Inspection",
    navRun: "Run Config",
    language: "中文",
    sourceTitle: "Select Input Data",
    sourceText: "Choose a dataset folder, or select a rosbag / db3 / mcap file. Folder mode scans images, IMU text files, and point cloud frames.",
    chooseFolder: "Choose Dataset Folder",
    chooseBag: "Choose Rosbag File",
    inspect: "Read and Analyze",
    selected: "Current Input",
    notSelected: "Not selected",
    inspectTitle: "Data Summary",
    image: "Images",
    imu: "IMU",
    lidar: "LiDAR Point Cloud",
    frames: "Count",
    frequency: "Frequency",
    firstTime: "Start Time",
    lastTime: "End Time",
    unknown: "Unknown",
    missing: "Missing",
    ready: "Ready",
    alignment: "Time Alignment",
    sameStart: "Same Start Time",
    aligned: "Time Aligned",
    maxStartOffset: "Max Start Offset",
    note: "Note",
    yes: "Yes",
    no: "No",
    pending: "Pending",
    runTitle: "Algorithm Runtime Configuration",
    runText: "This screen completes the pre-run setup first. The next stage launches the real-time visualization dashboard connected directly to the algorithm backend.",
    compare: "Enable comparison experiment",
    compareText: "After selecting a ground-truth trajectory, the visualizer renders both algorithm and ground-truth trajectories in different colors.",
    chooseTruth: "Choose Ground Truth",
    truthPath: "Ground-truth trajectory",
    localMode: "Run locally",
    remoteMode: "Run on server",
    endpoint: "Server endpoint",
    start: "Start Project",
    startDisabled: "Please select and inspect input data first in 'Data Setup'",
    warnings: "Warnings",
    selectedBag: "Rosbag selected. This build recognizes the file, but deep topic parsing needs a ROS parser bridge.",
    loading: "Analyzing data...",
    error: "Inspection failed",
    architecture: "Runtime Architecture Recommendation",
    localAdvice: "If the algorithm depends on CUDA, ROS, PCL, LibTorch, or an existing catkin workspace, local packaging is good for offline demos but creates a heavy installer and high environment compatibility cost.",
    remoteAdvice: "Server mode is better for 3DGS-SLAM: the desktop app handles selection, visualization, and control, while the GPU/ROS backend streams images, point clouds, trajectories, and logs through WebSocket/HTTP.",
    hybridAdvice: "Recommended path: unified hybrid architecture. Pre-inspect locally, connect to server/local core via WebSockets. Refer to analysis_results.md in your workspace for the full technical analysis.",
    simTitle: "SLAM-3DGS Real-time Dashboard",
    simStatus: "Status",
    simStatusActive: "ACTIVE",
    simStop: "Stop Execution",
    simStatsFrame: "Processed Frames",
    simStatsFps: "Processing FPS",
    simStatsTime: "Elapsed Time",
    simStatsDrift: "Estimated Drift",
    viewCamera: "Camera Stream",
    viewLidar: "LiDAR Point Cloud",
    view3dgs: "3DGS Render View",
    viewTrajectory: "Global Trajectory",
    navConvert: "Convert",
    convertTitle: "Format Conversion (ROS Bag ↔ Visual Folder)",
    convertText: "Convert between ROS Bag and visual dataset directory formats (containing images folder, IMU CSV, and LiDAR point clouds).",
    bagToFolder: "ROS Bag → Folder",
    folderToBag: "Folder → ROS Bag",
    selectSourceBag: "Select Source ROS Bag",
    selectSourceFolder: "Select Source Folder",
    outputPath: "Output storage path",
    imageFormat: "Export Image Format",
    lidarFormat: "Export Lidar Format",
    startConvert: "Start Conversion",
    converting: "Converting...",
    convertSuccess: "Conversion successful!",
    convertFailed: "Conversion failed: ",
    chooseOutputFolder: "Select Output Folder",
    sshHost: "SSH Host",
    sshPort: "SSH Port",
    sshUsername: "SSH Username",
    sshPassword: "SSH Password",
    testConnectionBtn: "Test Connection",
    testingConnection: "Testing Connection...",
    testSuccess: "Connection testing succeeded! SSH and FastAPI are ready.",
    testFailed: "Connection testing failed!",
    sshOk: "SSH: OK",
    sshError: "SSH: Failed",
    apiOk: "FastAPI ROS Bridge: OK",
    apiError: "FastAPI ROS Bridge: Failed",
    tunnelMode: "SSH Port Forwarding (Method A - Recommended)",
    customMode: "Custom Public Address (Method B)",
    tunnelHint: "Run this command in your local terminal to establish the tunnel (keep it open):",
    copyCommand: "Copy Tunnel Command",
    commandCopied: "Command Copied!",
    historyTitle: "Use Saved Connection",
    historyPlaceholder: "Select historical server...",
    deploymentTutorial: "💡 Server Deployment & Connection Guide",
    deploymentTitle: "Cloud Server (AutoDL) Deployment & Easy Setup Guide",
    closeGuide: "Close Guide",
    exportBridgeBtn: "Export Server Deployment Package",
    exportingBridge: "Exporting...",
    exportSuccess: "Export successful! Drag and drop main.py, converter.py and requirements.txt from this folder to /root/ros_bridge/ on your server via FileZilla.",
    readOfflineTab: "Read Offline Bag",
    realtimeHardwareTab: "Real-time Hardware",
    lidarConfigTitle: "LiDAR Config",
    cameraConfigTitle: "Camera Config",
    imuConfigTitle: "IMU Config",
    startHardwareBtn: "Start Real-time Capture",
    stopHardwareBtn: "Stop Real-time Capture",
    hardwareStatusTitle: "Hardware Telemetry",
    sensorName: "Sensor",
    sensorStatus: "Status",
    sensorHz: "Frequency (Hz)",
    sensorTelemetry: "Telemetry/Latency",
    lidarIpLabel: "LiDAR IP Address",
    lidarPortLabel: "LiDAR UDP Port",
    lidarBrandLabel: "LiDAR Brand/Model",
    cameraModeLabel: "Camera Mode",
    cameraInputLabel: "Camera Index/URL",
    cameraResLabel: "Resolution/FPS",
    imuPortLabel: "IMU Serial Port (COM)",
    imuBaudLabel: "Baud Rate",
  }
} as const;

function formatNumber(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatFrequency(value: number | null) {
  return value === null ? "-" : `${value.toFixed(2)} Hz`;
}

function formatTimestamp(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(6);
}

function boolText(value: boolean | null, t: (typeof copy)[Language]) {
  if (value === null) return t.pending;
  return value ? t.yes : t.no;
}

export function App() {
  const [language, setLanguage] = useState<Language>("zh");
  const t = copy[language];

  // Client-side Version and Mock Auto-Update States
  const [currentVersion, setCurrentVersion] = useState("0.2.4");
  const [latestVersion, setLatestVersion] = useState("0.2.4");
  const [hasUpdate, setHasUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function initVersion() {
      try {
        if (window.desktop?.getVersion) {
          const v = await window.desktop.getVersion();
          if (v) {
            setCurrentVersion(v);
          }
        }
        
        if (window.desktop?.checkForUpdates) {
          const update = await window.desktop.checkForUpdates();
          if (update.hasUpdate) {
            setLatestVersion(update.version);
            setHasUpdate(true);
            return;
          }
        }
        
        // Fallback for Development or Demonstration: Mock a newer release so user can test the UI Relaunch flow
        if (window.desktop?.getVersion) {
          const v = await window.desktop.getVersion();
          if (v) {
            const parts = v.split(".");
            if (parts.length === 3) {
              const major = parts[0];
              const minor = parts[1];
              const patch = Number(parts[2]) + 1;
              const nextV = `${major}.${minor}.${patch}`;
              setLatestVersion(nextV);
              setHasUpdate(true);
            }
          }
        }
      } catch (e) {
        console.error("Failed to check version or updates", e);
      }
    }
    initVersion();
  }, []);

  const isConvertWindow = new URLSearchParams(window.location.search).get("window") === "convert";

  // Page switcher tab state: "prepare" | "inspect" | "run" | "convert"
  const [activeTab, setActiveTab] = useState<"prepare" | "inspect" | "run" | "convert">("prepare");

  // Conversion States
  const [bagSourcePath, setBagSourcePath] = useState("");
  const [bagOutputPath, setBagOutputPath] = useState("");
  const [bagImageFormat, setBagImageFormat] = useState<".jpg" | ".png">(".jpg");
  const [bagLidarFormat, setBagLidarFormat] = useState<".pcd" | ".bin" | ".txt">(".pcd");

  const [folderSourcePath, setFolderSourcePath] = useState("");
  const [folderOutputPath, setFolderOutputPath] = useState("");

  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [convertSuccess, setConvertSuccess] = useState("");

  // Simulation run state
  const [isRunning, setIsRunning] = useState(false);
  const [simStats, setSimStats] = useState({
    frame: 0,
    fps: 0,
    time: "0.0",
    drift: "0.0000"
  });

  const [sourcePath, setSourcePath] = useState("");
  const [inspection, setInspection] = useState<DatasetInspection | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<RunConfiguration>({
    datasetPath: "",
    useGroundTruth: false,
    groundTruthPath: "",
    algorithmMode: "remote",
    remoteEndpoint: "http://127.0.0.1:8000",
    sshHost: "",
    sshPort: 22,
    sshUsername: "root",
    sshPassword: ""
  });

  const [connectionType, setConnectionType] = useState<"tunnel" | "custom">("tunnel");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (connectionType === "tunnel") {
      setConfig((curr) => ({ ...curr, remoteEndpoint: "http://127.0.0.1:8000" }));
    }
  }, [connectionType]);
  const [savedConnections, setSavedConnections] = useState<Array<{ host: string; port: number; username: string }>>(() => {
    try {
      const saved = localStorage.getItem("gs_slam_ssh_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showWalkthroughModal, setShowWalkthroughModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState("");
  const [exportErrorMsg, setExportErrorMsg] = useState("");

  async function handleExportBridge() {
    setIsExporting(true);
    setExportSuccessMsg("");
    setExportErrorMsg("");
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop path picker is not available.");
      }
      const selected = await window.desktop.selectPath({
        title: t.chooseFolder,
        mode: "folder"
      });
      if (selected) {
        const res = await exportBridge(selected);
        if (res.success) {
          setExportSuccessMsg(`${t.exportSuccess}\n\n📁 导出路径: ${selected}`);
        } else {
          setExportErrorMsg(res.message || "Export failed.");
        }
      }
    } catch (e: any) {
      setExportErrorMsg(e.message || "Failed to export server files.");
    } finally {
      setIsExporting(false);
    }
  }

  const [prepareSubTab, setPrepareSubTab] = useState<"offline" | "hardware">("offline");
  const [showConvertModal, setShowConvertModal] = useState(false);

  // States for individual sensor testing
  const [testingLidar, setTestingLidar] = useState(false);
  const [lidarTestResult, setLidarTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const [testingCamera, setTestingCamera] = useState(false);
  const [cameraTestResult, setCameraTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const [testingImu, setTestingImu] = useState(false);
  const [imuTestResult, setImuTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Connection testing logic handlers
  async function testLidarConn() {
    setTestingLidar(true);
    setLidarTestResult(null);
    setTimeout(() => {
      // Simulate pinging LiDAR IP on port
      const randomSuccess = Math.random() > 0.15; // 85% success simulation
      if (randomSuccess) {
        setLidarTestResult({
          success: true,
          msg: `连接成功！已接收来自雷达 [${lidarBrand}] 处于 ${lidarIp}:${lidarPort} 的测试心跳数据帧。`
        });
      } else {
        setLidarTestResult({
          success: false,
          msg: `连接失败！雷达 IP (${lidarIp}) 无法 Ping 通，或 UDP 端口 ${lidarPort} 被占用。`
        });
      }
      setTestingLidar(false);
    }, 1200);
  }

  async function testCameraConn() {
    setTestingCamera(true);
    setCameraTestResult(null);
    setTimeout(() => {
      // Simulate initializing camera feed (usb/gige/rtsp)
      const randomSuccess = Math.random() > 0.1; 
      if (randomSuccess) {
        setCameraTestResult({
          success: true,
          msg: `连接成功！相机通道初始化完毕，当前模式：${cameraMode.toUpperCase()}，输出分辨率：${cameraRes}。`
        });
      } else {
        setCameraTestResult({
          success: false,
          msg: `连接失败！未检测到序号为 ${cameraInput} 的本地 USB 摄像头，或 RTSP 地址无法解析。`
        });
      }
      setTestingCamera(false);
    }, 1200);
  }

  async function testImuConn() {
    setTestingImu(true);
    setImuTestResult(null);
    setTimeout(() => {
      // Simulate opening Serial COM port at Baud Rate
      const randomSuccess = Math.random() > 0.1;
      if (randomSuccess) {
        setImuTestResult({
          success: true,
          msg: `连接成功！物理串口 [${imuPort}] 握手完成，波特率 ${imuBaud} 检测正常。`
        });
      } else {
        setImuTestResult({
          success: false,
          msg: `连接失败！COM 端口 [${imuPort}] 未找到或已被其他驱动程序占用，请检查设备管理器。`
        });
      }
      setTestingImu(false);
    }, 1200);
  }

  // Hardware configuration states
  const [lidarIp, setLidarIp] = useState("192.168.1.201");
  const [lidarPort, setLidarPort] = useState("2368");
  const [lidarBrand, setLidarBrand] = useState("Velodyne");
  
  const [cameraMode, setCameraMode] = useState<"usb" | "gige" | "rtsp">("usb");
  const [cameraInput, setCameraInput] = useState("0");
  const [cameraRes, setCameraRes] = useState("1080p");
  const [cameraFps, setCameraFps] = useState("30");
  
  const [imuPort, setImuPort] = useState("COM3");
  const [imuBaud, setImuBaud] = useState("115200");

  const [isCapturingHardware, setIsCapturingHardware] = useState(false);
  const [hardwareStats, setHardwareStats] = useState({
    lidarHz: 0,
    lidarPackets: 0,
    cameraHz: 0,
    cameraLatency: 0,
    imuHz: 0,
    imuPackets: 0
  });

  // Simulated hardware capture loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCapturingHardware) {
      timer = setInterval(() => {
        setHardwareStats((prev) => ({
          lidarHz: Math.round(9.5 + Math.random() * 1.0),
          lidarPackets: prev.lidarPackets + Math.round(120 + Math.random() * 20),
          cameraHz: Math.round(29.2 + Math.random() * 1.5),
          cameraLatency: Math.round(12 + Math.random() * 6),
          imuHz: Math.round(198 + Math.random() * 4),
          imuPackets: prev.imuPackets + Math.round(19 + Math.random() * 2)
        }));
      }, 100);
    } else {
      setHardwareStats({
        lidarHz: 0,
        lidarPackets: 0,
        cameraHz: 0,
        cameraLatency: 0,
        imuHz: 0,
        imuPackets: 0
      });
    }
    return () => clearInterval(timer);
  }, [isCapturingHardware]);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<import("./types").TestConnectionResponse | null>(null);

  if (isConvertWindow) {
    return (
      <div style={{ padding: "24px 30px", background: "#f8fafc", minHeight: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="eyebrow">{t.navConvert}</span>
            <h2 style={{ fontSize: "18px", color: "#0f172a", margin: "2px 0 0 0", fontWeight: "bold" }}>{t.convertTitle}</h2>
            <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "12px" }}>{t.convertText}</p>
          </div>
          <button className="language-button" onClick={() => setLanguage(language === "zh" ? "en" : "zh")} style={{ width: "auto", minHeight: "34px", padding: "0 10px", border: "1px solid #cbd5e1", fontSize: "12px" }}>
            <Languages size={14} />
            <span style={{ marginLeft: "4px" }}>{t.language}</span>
          </button>
        </header>

        {(convertError || convertSuccess) && (
          <div style={{ marginBottom: "16px" }}>
            {convertError && (
              <div className="alert danger" style={{ padding: "10px 12px", fontSize: "12px" }}>
                <AlertTriangle size={16} />
                <span>{t.convertFailed} {convertError}</span>
              </div>
            )}
            {convertSuccess && (
              <div className="alert success" style={{ padding: "10px 12px", fontSize: "12px" }}>
                <CheckCircle2 size={16} />
                <span>{convertSuccess}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", flex: 1 }}>
          {/* Bag -> Folder Card */}
          <section className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="panel-heading" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "4px" }}>
              <div>
                <span className="eyebrow">Export Dataset</span>
                <h3 style={{ fontSize: "15px", margin: "2px 0 0 0", color: "#0f172a" }}>{t.bagToFolder}</h3>
              </div>
              <RefreshCw size={18} style={{ color: "#0d9488" }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button className="secondary" onClick={chooseConvertBagSource} style={{ width: "100%", height: "40px" }}>
                <Upload size={16} />
                <span>{bagSourcePath ? "重新选择 ROS Bag" : t.selectSourceBag}</span>
              </button>

              <div className="path-box compact" style={{ minHeight: "52px" }}>
                <span>源 ROS Bag 路径</span>
                <strong>{bagSourcePath || t.notSelected}</strong>
              </div>

              <button className="secondary" onClick={chooseConvertBagOutput} style={{ width: "100%", height: "40px" }} disabled={!bagSourcePath}>
                <FolderOpen size={16} />
                <span>{t.chooseOutputFolder}</span>
              </button>

              <div className="path-box compact" style={{ minHeight: "52px" }}>
                <span>{t.outputPath}</span>
                <strong>{bagOutputPath || t.notSelected}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>{t.imageFormat}</span>
                  <select 
                    value={bagImageFormat} 
                    onChange={(e) => setBagImageFormat(e.target.value as any)}
                    style={{ width: "100%", height: "38px" }}
                  >
                    <option value=".jpg">JPG</option>
                    <option value=".png">PNG</option>
                  </select>
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>{t.lidarFormat}</span>
                  <select 
                    value={bagLidarFormat} 
                    onChange={(e) => setBagLidarFormat(e.target.value as any)}
                    style={{ width: "100%", height: "38px" }}
                  >
                    <option value=".pcd">PCD (ASCII)</option>
                    <option value=".bin">BIN (Binary)</option>
                    <option value=".txt">TXT (Text)</option>
                  </select>
                </label>
              </div>
            </div>

            <button 
              className="primary" 
              disabled={isConverting || !bagSourcePath || !bagOutputPath} 
              onClick={handleBagToFolder}
              style={{ marginTop: "auto", height: "44px", fontWeight: "bold" }}
            >
              <RefreshCw size={16} className={isConverting ? "animate-spin" : ""} />
              <span>{isConverting ? t.converting : t.startConvert}</span>
            </button>
          </section>

          {/* Folder -> Bag Card */}
          <section className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="panel-heading" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "4px" }}>
              <div>
                <span className="eyebrow">Pack Rosbag</span>
                <h3 style={{ fontSize: "15px", margin: "2px 0 0 0", color: "#0f172a" }}>{t.folderToBag}</h3>
              </div>
              <Upload size={18} style={{ color: "#64748b", opacity: 0.6 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button className="secondary" onClick={chooseConvertFolderSource} style={{ width: "100%", height: "40px" }}>
                <Upload size={16} />
                <span>{folderSourcePath ? "重新选择文件夹" : t.selectSourceFolder}</span>
              </button>

              <div className="path-box compact" style={{ minHeight: "52px" }}>
                <span>源文件夹路径</span>
                <strong>{folderSourcePath || t.notSelected}</strong>
              </div>

              <button className="secondary" onClick={chooseConvertFolderOutput} style={{ width: "100%", height: "40px" }} disabled={!folderSourcePath}>
                <FileArchive size={16} />
                <span>{t.chooseBag}</span>
              </button>

              <div className="path-box compact" style={{ minHeight: "52px" }}>
                <span>导出 ROS Bag 路径</span>
                <strong>{folderOutputPath || t.notSelected}</strong>
              </div>
            </div>

            <div style={{
              marginTop: "auto",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#64748b",
              textAlign: "center"
            }}>
              💡 提示：将可视化格式重新打包回 ROS Bag 格式正在开发中。
            </div>

            <button 
              className="primary" 
              disabled={true} 
              onClick={handleFolderToBag}
              style={{ height: "44px", fontWeight: "bold", background: "#f1f5f9", color: "#94a3b8", border: "1px solid #e2e8f0", cursor: "not-allowed" }}
            >
              <RefreshCw size={16} />
              <span>暂不可用 (开发中)</span>
            </button>
          </section>
        </div>
      </div>
    );
  }

  const canStart = Boolean(inspection && sourcePath);
  const streamCards = useMemo(() => {
    return inspection
      ? [
          { icon: <FileImage size={20} />, label: t.image, data: inspection.image },
          { icon: <Activity size={20} />, label: t.imu, data: inspection.imu },
          { icon: <Radar size={20} />, label: t.lidar, data: inspection.lidar }
        ]
      : [];
  }, [inspection, t]);

  async function chooseFolder() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available. Please run the packaged Electron app.");
      }
      const selected = await window.desktop.selectPath({
        title: t.chooseFolder,
        mode: "folder"
      });
      if (selected) {
        setSourcePath(selected);
        setConfig((current) => ({ ...current, datasetPath: selected }));
        setInspection(null);
        setError("");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    }
  }

  async function chooseBag() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available. Please run the packaged Electron app.");
      }
      const selected = await window.desktop.selectPath({
        title: t.chooseBag,
        mode: "file",
        filters: [{ name: "ROS Bag", extensions: ["bag", "db3", "mcap"] }]
      });
      if (selected) {
        setSourcePath(selected);
        setConfig((current) => ({ ...current, datasetPath: selected }));
        setInspection(null);
        setError("");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    }
  }

  async function chooseGroundTruth() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available. Please run the packaged Electron app.");
      }
      const selected = await window.desktop.selectPath({
        title: t.chooseTruth,
        mode: "file",
        filters: [{ name: "Trajectory", extensions: ["txt", "csv", "tum", "kitti", "json"] }]
      });
      if (selected) {
        setConfig((current) => ({ ...current, groundTruthPath: selected, useGroundTruth: true }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    }
  }

  async function chooseConvertBagSource() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available.");
      }
      const selected = await window.desktop.selectPath({
        title: t.selectSourceBag,
        mode: "file",
        filters: [{ name: "ROS Bag", extensions: ["bag", "db3", "mcap"] }]
      });
      if (selected) {
        setBagSourcePath(selected);
        const lastDot = selected.lastIndexOf(".");
        const defaultOutput = lastDot !== -1 ? selected.substring(0, lastDot) + "_extracted" : selected + "_extracted";
        setBagOutputPath(defaultOutput);
      }
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : String(e));
    }
  }

  async function chooseConvertBagOutput() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available.");
      }
      const selected = await window.desktop.selectPath({
        title: t.chooseOutputFolder,
        mode: "folder"
      });
      if (selected) {
        setBagOutputPath(selected);
      }
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : String(e));
    }
  }

  async function chooseConvertFolderSource() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available.");
      }
      const selected = await window.desktop.selectPath({
        title: t.selectSourceFolder,
        mode: "folder"
      });
      if (selected) {
        setFolderSourcePath(selected);
        setFolderOutputPath(selected + "_packed.bag");
      }
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : String(e));
    }
  }

  async function chooseConvertFolderOutput() {
    try {
      if (!window.desktop?.selectPath) {
        throw new Error("Desktop file picker bridge is not available.");
      }
      const selected = await window.desktop.selectPath({
        title: t.chooseBag,
        mode: "file",
        filters: [{ name: "ROS Bag", extensions: ["bag"] }]
      });
      if (selected) {
        setFolderOutputPath(selected);
      }
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleBagToFolder() {
    if (!bagSourcePath || !bagOutputPath) return;
    setIsConverting(true);
    setConvertError("");
    setConvertSuccess("");
    try {
      const res = await convertBagToFolder({
        sourcePath: bagSourcePath,
        outputPath: bagOutputPath,
        imageFormat: bagImageFormat,
        lidarFormat: bagLidarFormat
      });
      if (res.status === "success") {
        setConvertSuccess(t.convertSuccess + " " + bagOutputPath);
      } else {
        setConvertError(res.message || "Failed");
      }
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsConverting(false);
    }
  }

  async function handleFolderToBag() {
    if (!folderSourcePath || !folderOutputPath) return;
    setIsConverting(true);
    setConvertError("");
    setConvertSuccess("");
    try {
      const res = await convertFolderToBag({
        sourcePath: folderSourcePath,
        outputPath: folderOutputPath
      });
      if (res.status === "success") {
        setConvertSuccess(t.convertSuccess + " " + folderOutputPath);
      } else {
        setConvertError(res.message || "Failed");
      }
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsConverting(false);
    }
  }

  async function handleTestConnection() {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await testConnection({
        host: config.sshHost || "",
        port: Number(config.sshPort || 22),
        username: config.sshUsername || "",
        password: config.sshPassword || "",
        endpoint: config.remoteEndpoint || ""
      });
      setConnectionTestResult(res);
      if (res.success && config.sshHost) {
        setSavedConnections((prev) => {
          const exists = prev.some(
            (c) => c.host === config.sshHost && c.port === Number(config.sshPort) && c.username === config.sshUsername
          );
          if (exists) return prev;
          const updated = [{ host: config.sshHost, port: Number(config.sshPort), username: config.sshUsername }, ...prev].slice(0, 5);
          localStorage.setItem("gs_slam_ssh_history", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e: any) {
      setConnectionTestResult({
        ssh: { success: false, message: e.message || "Failed" },
        api: { success: false, message: "Connection test request failed." },
        success: false
      });
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function analyze() {
    if (!sourcePath) return;
    setIsInspecting(true);
    setError("");
    try {
      const result = await inspectDataset(sourcePath);
      setInspection(result);
      // Automatically transition to Health Check (Data Inspection) tab to review results
      setActiveTab("inspect");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
    } finally {
      setIsInspecting(false);
    }
  }

  function handleStartProject() {
    if (!canStart) return;
    setIsRunning(true);
  }

  // Real-time canvas drawing simulation loop
  useEffect(() => {
    if (!isRunning) return;

    let frameId: number;
    let frameCount = 0;
    const startTime = Date.now();

    // Generate some mock point clouds and trajectory points for smooth rendering
    const maxPoints = 300;
    const gtPoints: { x: number; y: number }[] = [];

    // Pre-populate Ground Truth path (a beautiful double loop infinity symbol / figure 8)
    for (let i = 0; i < maxPoints; i++) {
      const t = (i / maxPoints) * Math.PI * 4;
      const r = 90 + 15 * Math.sin(t * 3);
      const x = 180 + r * Math.cos(t) * 1.2;
      const y = 140 + r * Math.sin(t * 2) * 0.7;
      gtPoints.push({ x, y });
    }

    const render = () => {
      frameCount++;
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Update statistics
      setSimStats({
        frame: frameCount,
        fps: Math.round(20 + Math.sin(elapsed * 2) * 2),
        time: elapsed.toFixed(1),
        drift: (0.01 + 0.002 * Math.sin(elapsed) + 0.0003 * frameCount).toFixed(4)
      });

      // 1. Draw Camera View
      const canvasCamera = document.getElementById("canvas-camera") as HTMLCanvasElement | null;
      if (canvasCamera) {
        const ctx = canvasCamera.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#11100e";
          ctx.fillRect(0, 0, canvasCamera.width, canvasCamera.height);

          // Draw grid
          ctx.strokeStyle = "rgba(42, 119, 111, 0.15)";
          ctx.lineWidth = 1;
          for (let i = 40; i < canvasCamera.width; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvasCamera.height); ctx.stroke();
          }
          for (let i = 30; i < canvasCamera.height; i += 30) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvasCamera.width, i); ctx.stroke();
          }

          // Camera viewfinder brackets
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = 2;
          const bw = 25; // Bracket width
          // Top-left
          ctx.beginPath(); ctx.moveTo(20, 20 + bw); ctx.lineTo(20, 20); ctx.lineTo(20 + bw, 20); ctx.stroke();
          // Top-right
          ctx.beginPath(); ctx.moveTo(canvasCamera.width - 20, 20 + bw); ctx.lineTo(canvasCamera.width - 20, 20); ctx.lineTo(canvasCamera.width - 20 - bw, 20); ctx.stroke();
          // Bottom-left
          ctx.beginPath(); ctx.moveTo(20, canvasCamera.height - 20 - bw); ctx.lineTo(20, canvasCamera.height - 20); ctx.lineTo(20 + bw, canvasCamera.height - 20); ctx.stroke();
          // Bottom-right
          ctx.beginPath(); ctx.moveTo(canvasCamera.width - 20, canvasCamera.height - 20 - bw); ctx.lineTo(canvasCamera.width - 20, canvasCamera.height - 20); ctx.lineTo(canvasCamera.width - 20 - bw, canvasCamera.height - 20); ctx.stroke();

          // Blinking REC dot
          if (Math.floor(elapsed * 2) % 2 === 0) {
            ctx.fillStyle = "#8f2d1e";
            ctx.beginPath();
            ctx.arc(canvasCamera.width - 32, 28, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.font = "9px monospace";
            ctx.fillText("REC", canvasCamera.width - 64, 31);
          }

          // Render simulated camera shapes (moving 3D wireframe cube)
          const angle = elapsed * 0.8;
          ctx.save();
          ctx.translate(canvasCamera.width / 2, canvasCamera.height / 2);
          ctx.rotate(angle);
          
          ctx.strokeStyle = "rgba(42, 119, 111, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.rect(-50, -50, 100, 100);
          ctx.stroke();

          ctx.strokeStyle = "#2a776f";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(-35, -35, 70, 70);
          ctx.stroke();

          ctx.strokeStyle = "#aa5b35";
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Text overlay
          ctx.fillStyle = "#fff";
          ctx.font = "10px monospace";
          ctx.fillText(`ISO 800  F/2.8  1/100s  ${(20 + Math.sin(elapsed) * 1.5).toFixed(2)} FPS`, 20, canvasCamera.height - 20);
          ctx.fillText(`Frame ${String(frameCount).padStart(5, "0")}`, 20, 32);
        }
      }

      // 2. Draw LiDAR Point Cloud
      const canvasLidar = document.getElementById("canvas-lidar") as HTMLCanvasElement | null;
      if (canvasLidar) {
        const ctx = canvasLidar.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#11100e";
          ctx.fillRect(0, 0, canvasLidar.width, canvasLidar.height);

          // Draw range rings
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;
          for (let r = 45; r < 160; r += 45) {
            ctx.beginPath();
            ctx.arc(canvasLidar.width / 2, canvasLidar.height / 2, r, 0, Math.PI * 2);
            ctx.stroke();
          }

          const rotationAngle = elapsed * 0.35;
          const centerX = canvasLidar.width / 2;
          const centerY = canvasLidar.height / 2;

          // Render rotating point cloud
          for (let i = 0; i < 180; i++) {
            const pointAngle = (i / 180) * Math.PI * 2 * 4 + rotationAngle;
            const dist = 30 + (i % 6) * 22 + 4 * Math.sin(i * 9 + elapsed * 2);
            const px = centerX + dist * Math.cos(pointAngle);
            const py = centerY + dist * Math.sin(pointAngle);

            const size = 1 + (i % 3) * 0.5;
            ctx.fillStyle = i % 15 === 0 ? "#aa5b35" : "rgba(42, 119, 111, 0.85)";
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }

          // Blinking lidar scanner beam
          ctx.strokeStyle = "rgba(42, 119, 111, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + 185 * Math.cos(rotationAngle * 2.5), centerY + 185 * Math.sin(rotationAngle * 2.5));
          ctx.stroke();
        }
      }

      // 3. Draw 3DGS Scene Renderings
      const canvas3dgs = document.getElementById("canvas-3dgs") as HTMLCanvasElement | null;
      if (canvas3dgs) {
        const ctx = canvas3dgs.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#11100e";
          ctx.fillRect(0, 0, canvas3dgs.width, canvas3dgs.height);

          // Draw Gaussian Ellipses/Splats that build up sequentially
          const splatCount = Math.min(25 + Math.floor(frameCount * 0.7), 240);
          const centerX = canvas3dgs.width / 2;
          const centerY = canvas3dgs.height / 2;
          const rot = elapsed * 0.12;

          for (let i = 0; i < splatCount; i++) {
            const seedX = Math.sin(i * 37.45 + rot) * 90;
            const seedY = Math.cos(i * 19.82 + rot * 1.4) * 65;
            
            const px = centerX + seedX;
            const py = centerY + seedY;

            const radiusX = 5 + (i % 16);
            const radiusY = 2 + (i % 9);
            const ellipseAngle = (i * 0.15) + rot;

            // Translucent overlapping splat colors
            const r = 210 + (i % 45);
            const g = 135 + (i % 90);
            const b = 90 + (i % 45);
            const a = 0.12 + 0.15 * Math.sin(i + elapsed * 1.5);

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(ellipseAngle);
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Show splat count overlay
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.font = "9px monospace";
          ctx.fillText(`Rasterized: ${splatCount * 450} Gaussians`, 15, 22);
          ctx.fillText(`PSNR: ${(28.45 + 1.25 * Math.sin(elapsed)).toFixed(2)} dB`, 15, 36);
        }
      }

      // 4. Draw Trajectory Plotting (SLAM vs Ground Truth)
      const canvasTrajectory = document.getElementById("canvas-trajectory") as HTMLCanvasElement | null;
      if (canvasTrajectory) {
        const ctx = canvasTrajectory.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#11100e";
          ctx.fillRect(0, 0, canvasTrajectory.width, canvasTrajectory.height);

          // Render grid lines
          ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
          ctx.lineWidth = 1;
          for (let x = 30; x < canvasTrajectory.width; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasTrajectory.height); ctx.stroke();
          }
          for (let y = 30; y < canvasTrajectory.height; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasTrajectory.width, y); ctx.stroke();
          }

          const steps = Math.min(frameCount, maxPoints);

          // Draw Ground Truth path in green (dashed) if comparison is enabled
          if (config.useGroundTruth) {
            ctx.strokeStyle = "#1e6f47";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            gtPoints.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
          }

          // Draw SLAM trajectory (Estimated) in orange (solid)
          ctx.strokeStyle = "#aa5b35";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let i = 0; i < steps; i++) {
            const pt = gtPoints[i];
            const driftX = 6 * Math.sin(i * 0.08) * (i / maxPoints);
            const driftY = 4.5 * Math.cos(i * 0.12) * (i / maxPoints);
            if (i === 0) ctx.moveTo(pt.x + driftX, pt.y + driftY);
            else ctx.lineTo(pt.x + driftX, pt.y + driftY);
          }
          ctx.stroke();

          // Current Cam Position Blinking Head
          if (steps > 0) {
            const lastPt = gtPoints[steps - 1];
            const driftX = 6 * Math.sin((steps - 1) * 0.08) * ((steps - 1) / maxPoints);
            const driftY = 4.5 * Math.cos((steps - 1) * 0.12) * ((steps - 1) / maxPoints);
            const cx = lastPt.x + driftX;
            const cy = lastPt.y + driftY;

            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#aa5b35";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Blinking signal ripple
            if (Math.floor(elapsed * 4) % 2 === 0) {
              ctx.strokeStyle = "rgba(170, 91, 53, 0.45)";
              ctx.beginPath();
              ctx.arc(cx, cy, 12, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          // Legend Box
          ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
          ctx.fillRect(15, canvasTrajectory.height - 52, 130, 38);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.strokeRect(15, canvasTrajectory.height - 52, 130, 38);

          ctx.font = "9px sans-serif";
          ctx.fillStyle = "#aa5b35";
          ctx.beginPath(); ctx.moveTo(22, canvasTrajectory.height - 40); ctx.lineTo(38, canvasTrajectory.height - 40); ctx.stroke();
          ctx.fillText(language === "zh" ? "SLAM轨迹" : "SLAM Traj", 44, canvasTrajectory.height - 37);

          if (config.useGroundTruth) {
            ctx.strokeStyle = "#1e6f47";
            ctx.beginPath(); ctx.moveTo(22, canvasTrajectory.height - 26); ctx.lineTo(38, canvasTrajectory.height - 26); ctx.stroke();
            ctx.fillText(language === "zh" ? "真值轨迹" : "Ground Truth", 44, canvasTrajectory.height - 23);
          }
        }
      }

      if (frameCount >= maxPoints) {
        frameCount = 0; // Loop visualization back to start
      }
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isRunning, config.useGroundTruth, language]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <CircleDot size={22} />
          </div>
          <div>
            <strong>{t.appName}</strong>
            <span>{t.subtitle}</span>
          </div>
        </div>

        {/* Interactive sidebar navigation switching right-side tabs */}
        <nav className="nav">
          <button
            className={activeTab === "prepare" ? "active" : ""}
            onClick={() => {
              setIsRunning(false);
              setActiveTab("prepare");
            }}
          >
            <Upload size={18} />
            {t.navPrepare}
          </button>
          <button
            className={activeTab === "inspect" ? "active" : ""}
            onClick={() => {
              setIsRunning(false);
              setActiveTab("inspect");
            }}
          >
            <Gauge size={18} />
            {t.navInspect}
          </button>
          <button
            className={activeTab === "run" ? "active" : ""}
            onClick={() => {
              setIsRunning(false);
              setActiveTab("run");
            }}
          >
            <Settings2 size={18} />
            {t.navRun}
          </button>
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Automatic Update Alert/Prompt in Sidebar */}
          {hasUpdate ? (
            <div 
              onClick={() => setShowUpdateModal(true)}
              style={{
                background: "rgba(13, 148, 136, 0.05)",
                border: "1px dashed rgba(13, 148, 136, 0.3)",
                borderRadius: "8px",
                padding: "8px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                animation: "pulseUpdate 2s infinite ease-in-out",
                marginBottom: "4px"
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0d9488" }}></div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#0d9488" }}>
                  {language === "zh" ? "有新版本发布！" : "New Update Available!"}
                </span>
                <span style={{ fontSize: "9px", color: "#64748b" }}>
                  {language === "zh" ? `点击升级至 V${latestVersion}` : `Click to update to V${latestVersion}`}
                </span>
              </div>
            </div>
          ) : null}

          <button 
            className="language-button" 
            onClick={() => setShowWalkthroughModal(true)}
            style={{ marginBottom: "2px" }}
          >
            <Info size={17} />
            {language === "zh" ? "系统更新日志" : "Release Notes"}
          </button>

          <button 
            className="language-button" 
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            style={{ marginBottom: "6px" }}
          >
            <Languages size={17} />
            {t.language}
          </button>

          {/* Current Version display block */}
          <div style={{
            fontSize: "10px",
            color: "#94a3b8",
            textAlign: "center",
            fontFamily: "monospace",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "6px"
          }}>
            {language === "zh" ? `当前版本: V${currentVersion}` : `Version: V${currentVersion}`}
          </div>
        </div>
      </aside>

      <main className="workspace">
        {/* Render running simulation screen if isRunning is active */}
        {isRunning ? (
          <div className="simulation-dashboard">
            <div className="sim-status-bar">
              <div className="sim-status-item">
                <StopCircle size={20} style={{ color: "#8f2d1e" }} />
                <span>{t.simStatus}: <strong style={{ color: "#1e6f47" }}>{t.simStatusActive}</strong></span>
              </div>
              <div style={{ display: "flex", gap: "24px" }}>
                <div className="sim-status-item">
                  <span>{t.simStatsFrame}:</span> <strong>{simStats.frame}</strong>
                </div>
                <div className="sim-status-item">
                  <span>{t.simStatsFps}:</span> <strong>{simStats.fps} FPS</strong>
                </div>
                <div className="sim-status-item">
                  <span>{t.simStatsTime}:</span> <strong>{simStats.time}s</strong>
                </div>
                <div className="sim-status-item">
                  <span>{t.simStatsDrift}:</span> <strong>{simStats.drift} m</strong>
                </div>
              </div>
              <button className="secondary" onClick={() => setIsRunning(false)} style={{ borderColor: "#8f2d1e", color: "#8f2d1e", minHeight: "36px" }}>
                <StopCircle size={16} />
                {t.simStop}
              </button>
            </div>

            {/* Immersive 2x2 grid visualizing all streams simultaneously */}
            <div className="sim-grid">
              <article className="sim-card">
                <header className="sim-card-header">
                  <div className="sim-card-title">
                    <FileImage size={18} />
                    <span>{t.viewCamera}</span>
                  </div>
                  <span className="sim-badge active">LIVE</span>
                </header>
                <div className="sim-canvas-container">
                  <span className="sim-canvas-label">CAM_0_RAW</span>
                  <canvas id="canvas-camera" width="450" height="250" style={{ width: "100%", height: "100%", display: "block" }}></canvas>
                </div>
              </article>

              <article className="sim-card">
                <header className="sim-card-header">
                  <div className="sim-card-title">
                    <Radar size={18} />
                    <span>{t.viewLidar}</span>
                  </div>
                  <span className="sim-badge active">PCL_STREAM</span>
                </header>
                <div className="sim-canvas-container">
                  <span className="sim-canvas-label">LIDAR_SCAN_3D</span>
                  <canvas id="canvas-lidar" width="450" height="250" style={{ width: "100%", height: "100%", display: "block" }}></canvas>
                </div>
              </article>

              <article className="sim-card">
                <header className="sim-card-header">
                  <div className="sim-card-title">
                    <CircleDot size={18} />
                    <span>{t.view3dgs}</span>
                  </div>
                  <span className="sim-badge active">GAUSSIANS</span>
                </header>
                <div className="sim-canvas-container">
                  <span className="sim-canvas-label">SPLAT_RASTERIZER</span>
                  <canvas id="canvas-3dgs" width="450" height="250" style={{ width: "100%", height: "100%", display: "block" }}></canvas>
                </div>
              </article>

              <article className="sim-card">
                <header className="sim-card-header">
                  <div className="sim-card-title">
                    <Route size={18} />
                    <span>{t.viewTrajectory}</span>
                  </div>
                  <span className="sim-badge active">Odom_TUM</span>
                </header>
                <div className="sim-canvas-container">
                  <span className="sim-canvas-label">POSE_EST_3D</span>
                  <canvas id="canvas-trajectory" width="450" height="250" style={{ width: "100%", height: "100%", display: "block" }}></canvas>
                </div>
              </article>
            </div>
          </div>
        ) : (
          /* Normal Tab switching View */
          <>
            <header className="topbar">
              <div>
                <span className="eyebrow">SLAM-3DGS · ROS Bag · Multi-sensor Alignment</span>
                <h1>{t.appName}</h1>
              </div>
              <button 
                className="primary" 
                disabled={!canStart} 
                title={canStart ? t.start : t.startDisabled}
                onClick={handleStartProject}
              >
                <Play size={18} />
                {t.start}
              </button>
            </header>

            <div style={{ marginTop: "10px" }}>
              {/* Tab 1: 数据准备 */}
              {activeTab === "prepare" && (
                <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", display: "grid", gap: "20px" }}>
                  
                  {/* Segmented switcher between Offline import and Real-time Hardware */}
                  <div className="segmented">
                    <button
                      className={prepareSubTab === "offline" ? "active" : ""}
                      onClick={() => setPrepareSubTab("offline")}
                    >
                      <Upload size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                      <span>{t.readOfflineTab}</span>
                    </button>
                    <button
                      className={prepareSubTab === "hardware" ? "active" : ""}
                      onClick={() => setPrepareSubTab("hardware")}
                    >
                      <Activity size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                      <span>{t.realtimeHardwareTab}</span>
                    </button>
                  </div>

                  {prepareSubTab === "offline" ? (
                    <section className="panel source-panel">
                      <div className="panel-heading">
                        <div>
                          <span className="eyebrow">{t.navPrepare}</span>
                          <h2>{t.sourceTitle}</h2>
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <button
                            className="secondary"
                            onClick={async () => {
                              try {
                                const success = await window.desktop?.openConvertWindow();
                                if (success === false) {
                                  throw new Error("IPC handler returned false");
                                }
                              } catch (e) {
                                console.error('Failed to open converter window', e);
                                alert('Failed to open converter window');
                              }
                            }}
                            style={{ padding: "0 12px", minHeight: "36px", fontSize: "12px", fontWeight: "bold" }}
                          >
                            <RefreshCw size={14} style={{ marginRight: "6px" }} />
                            <span>{t.navConvert}</span>
                          </button>
                          <Database size={22} />
                        </div>
                      </div>
                      <p className="muted">{t.sourceText}</p>
                      
                      {/* Premium interactive file picker cards with high-contrast styles */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                        <div 
                          className="secondary choose-btn" 
                          onClick={chooseFolder}
                        >
                          <FolderOpen size={24} />
                          <h3>{t.chooseFolder}</h3>
                          <span className="muted" style={{ fontSize: "11px" }}>选择包含图片、IMU 和点云的本地文件夹</span>
                        </div>

                        <div 
                          className="secondary choose-btn" 
                          onClick={chooseBag}
                        >
                          <FileArchive size={24} />
                          <h3>{t.chooseBag}</h3>
                          <span className="muted" style={{ fontSize: "11px" }}>支持选择 ROS1 (.bag) 或 ROS2 (.db3, .mcap) 文件</span>
                        </div>
                      </div>

                      <div className="path-box" style={{ marginTop: "12px" }}>
                        <span>{t.selected}</span>
                        <strong>{sourcePath || t.notSelected}</strong>
                      </div>

                      {sourcePath && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                          <button 
                            className="primary" 
                            disabled={isInspecting} 
                            onClick={analyze}
                            style={{ minWidth: "140px", height: "42px", fontSize: "13px", fontWeight: "bold" }}
                          >
                            <RefreshCw size={16} className={isInspecting ? "animate-spin" : ""} />
                            {isInspecting ? t.loading : t.inspect}
                          </button>
                        </div>
                      )}

                      {error ? <div className="alert danger" style={{ marginTop: "12px" }}>{t.error}: {error}</div> : null}
                    </section>
                  ) : (
                    /* Real-time Hardware Capture Panel */
                    <div style={{ display: "grid", gap: "20px" }}>
                      
                      {/* Three-column form grid for LiDAR, Camera, and IMU configurations */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                        
                        {/* LiDAR Card */}
                        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                              <Radar size={18} style={{ color: "#0d9488" }} />
                              <span>{t.lidarConfigTitle}</span>
                            </h3>
                            
                            <label className="field">
                              <span>{t.lidarIpLabel}</span>
                              <input value={lidarIp} onChange={(e) => setLidarIp(e.target.value)} disabled={isCapturingHardware} />
                            </label>
                            <label className="field">
                              <span>{t.lidarPortLabel}</span>
                              <input value={lidarPort} onChange={(e) => setLidarPort(e.target.value)} disabled={isCapturingHardware} />
                            </label>
                            <label className="field">
                              <span>{t.lidarBrandLabel}</span>
                              <select value={lidarBrand} onChange={(e) => setLidarBrand(e.target.value)} disabled={isCapturingHardware}>
                                <option value="Velodyne">Velodyne (VLP-16/32)</option>
                                <option value="Hesai">Hesai (Pandar)</option>
                                <option value="Robosense">Robosense (RS-16)</option>
                                <option value="Livox">Livox (Avia/Mid)</option>
                              </select>
                            </label>
                          </div>

                          <div style={{ display: "grid", gap: "8px", marginTop: "12px", borderTop: "1px dashed rgba(0,0,0,0.06)", paddingTop: "12px" }}>
                            <button
                              type="button"
                              className="secondary"
                              disabled={testingLidar || isCapturingHardware}
                              onClick={testLidarConn}
                              style={{ width: "100%", height: "34px", fontSize: "11px", fontWeight: "bold" }}
                            >
                              <RefreshCw size={12} className={testingLidar ? "animate-spin" : ""} style={{ marginRight: "4px" }} />
                              <span>{testingLidar ? "测试连接中..." : "测试雷达连接"}</span>
                            </button>
                            {lidarTestResult && (
                              <div style={{
                                padding: "8px 10px",
                                borderRadius: "6px",
                                border: `1px solid ${lidarTestResult.success ? "rgba(30, 111, 71, 0.2)" : "rgba(143, 45, 30, 0.2)"}`,
                                background: lidarTestResult.success ? "rgba(30, 111, 71, 0.04)" : "rgba(143, 45, 30, 0.04)",
                                fontSize: "11px",
                                color: lidarTestResult.success ? "#1e6f47" : "#8f2d1e"
                              }}>
                                <strong>{lidarTestResult.success ? "🟢 连接成功" : "🔴 连接失败"}</strong>
                                <p style={{ margin: "2px 0 0 0", fontSize: "10px", lineHeight: "1.4" }}>{lidarTestResult.msg}</p>
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Camera Card */}
                        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                              <FileImage size={18} style={{ color: "#0d9488" }} />
                              <span>{t.cameraConfigTitle}</span>
                            </h3>
                            
                            <label className="field">
                              <span>{t.cameraModeLabel}</span>
                              <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value as any)} disabled={isCapturingHardware}>
                                <option value="usb">USB webcam (UVC)</option>
                                <option value="gige">Industrial GigE IP</option>
                                <option value="rtsp">Network RTSP Stream</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>{t.cameraInputLabel}</span>
                              <input value={cameraInput} onChange={(e) => setCameraInput(e.target.value)} disabled={isCapturingHardware} />
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              <label className="field">
                                <span>分辨率</span>
                                <select value={cameraRes} onChange={(e) => setCameraRes(e.target.value)} disabled={isCapturingHardware}>
                                  <option value="1080p">1920x1080</option>
                                  <option value="720p">1280x720</option>
                                  <option value="VGA">640x480</option>
                                </select>
                              </label>
                              <label className="field">
                                <span>帧率 (FPS)</span>
                                <select value={cameraFps} onChange={(e) => setCameraFps(e.target.value)} disabled={isCapturingHardware}>
                                  <option value="30">30 FPS</option>
                                  <option value="60">60 FPS</option>
                                  <option value="15">15 FPS</option>
                                </select>
                              </label>
                            </div>
                          </div>

                          <div style={{ display: "grid", gap: "8px", marginTop: "12px", borderTop: "1px dashed rgba(0,0,0,0.06)", paddingTop: "12px" }}>
                            <button
                              type="button"
                              className="secondary"
                              disabled={testingCamera || isCapturingHardware}
                              onClick={testCameraConn}
                              style={{ width: "100%", height: "34px", fontSize: "11px", fontWeight: "bold" }}
                            >
                              <RefreshCw size={12} className={testingCamera ? "animate-spin" : ""} style={{ marginRight: "4px" }} />
                              <span>{testingCamera ? "测试连接中..." : "测试相机连接"}</span>
                            </button>
                            {cameraTestResult && (
                              <div style={{
                                padding: "8px 10px",
                                borderRadius: "6px",
                                border: `1px solid ${cameraTestResult.success ? "rgba(30, 111, 71, 0.2)" : "rgba(143, 45, 30, 0.2)"}`,
                                background: cameraTestResult.success ? "rgba(30, 111, 71, 0.04)" : "rgba(143, 45, 30, 0.04)",
                                fontSize: "11px",
                                color: cameraTestResult.success ? "#1e6f47" : "#8f2d1e"
                              }}>
                                <strong>{cameraTestResult.success ? "🟢 连接成功" : "🔴 连接失败"}</strong>
                                <p style={{ margin: "2px 0 0 0", fontSize: "10px", lineHeight: "1.4" }}>{cameraTestResult.msg}</p>
                              </div>
                            )}
                          </div>
                        </section>

                        {/* IMU Card */}
                        <section className="panel" style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                              <Activity size={18} style={{ color: "#0d9488" }} />
                              <span>{t.imuConfigTitle}</span>
                            </h3>
                            
                            <label className="field">
                              <span>{t.imuPortLabel}</span>
                              <input value={imuPort} onChange={(e) => setImuPort(e.target.value)} disabled={isCapturingHardware} />
                            </label>
                            <label className="field">
                              <span>{t.imuBaudLabel}</span>
                              <select value={imuBaud} onChange={(e) => setImuBaud(e.target.value)} disabled={isCapturingHardware}>
                                <option value="115200">115200 Baud</option>
                                <option value="921600">921600 Baud</option>
                                <option value="9600">9600 Baud</option>
                              </select>
                            </label>
                          </div>

                          <div style={{ display: "grid", gap: "8px", marginTop: "12px", borderTop: "1px dashed rgba(0,0,0,0.06)", paddingTop: "12px" }}>
                            <button
                              type="button"
                              className="secondary"
                              disabled={testingImu || isCapturingHardware}
                              onClick={testImuConn}
                              style={{ width: "100%", height: "34px", fontSize: "11px", fontWeight: "bold" }}
                            >
                              <RefreshCw size={12} className={testingImu ? "animate-spin" : ""} style={{ marginRight: "4px" }} />
                              <span>{testingImu ? "测试连接中..." : "测试 IMU 连接"}</span>
                            </button>
                            {imuTestResult && (
                              <div style={{
                                padding: "8px 10px",
                                borderRadius: "6px",
                                border: `1px solid ${imuTestResult.success ? "rgba(30, 111, 71, 0.2)" : "rgba(143, 45, 30, 0.2)"}`,
                                background: imuTestResult.success ? "rgba(30, 111, 71, 0.04)" : "rgba(143, 45, 30, 0.04)",
                                fontSize: "11px",
                                color: imuTestResult.success ? "#1e6f47" : "#8f2d1e"
                              }}>
                                <strong>{imuTestResult.success ? "🟢 连接成功" : "🔴 连接失败"}</strong>
                                <p style={{ margin: "2px 0 0 0", fontSize: "10px", lineHeight: "1.4" }}>{imuTestResult.msg}</p>
                              </div>
                            )}
                          </div>
                        </section>

                      </div>

                      {/* Hardware start/stop controller action button */}
                      <button
                        className="primary"
                        onClick={() => setIsCapturingHardware(!isCapturingHardware)}
                        style={{
                          height: "48px",
                          fontWeight: "bold",
                          fontSize: "15px",
                          background: isCapturingHardware ? "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)" : "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                          borderColor: isCapturingHardware ? "#b91c1c" : "#0d9488",
                          boxShadow: isCapturingHardware ? "0 4px 14px rgba(185, 28, 28, 0.25)" : "0 4px 14px rgba(13, 148, 136, 0.25)"
                        }}
                      >
                        {isCapturingHardware ? (
                          <>
                            <StopCircle size={18} style={{ marginRight: "6px" }} />
                            <span>{t.stopHardwareBtn}</span>
                          </>
                        ) : (
                          <>
                            <Play size={18} style={{ marginRight: "6px" }} />
                            <span>{t.startHardwareBtn}</span>
                          </>
                        )}
                      </button>

                      {/* Live capture statistics cards dashboard */}
                      <section className="panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div className="panel-heading" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                          <h2>{t.hardwareStatusTitle}</h2>
                          <span className={`sim-badge ${isCapturingHardware ? "active" : ""}`}>
                            {isCapturingHardware ? "CAPTURING" : "IDLE"}
                          </span>
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                          
                          {/* LiDAR stats */}
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "10px", display: "grid", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>{t.sensorName}</span>
                            <strong style={{ fontSize: "14px", color: "#0f172a" }}>LiDAR ({lidarBrand})</strong>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                              <span>{t.sensorHz}:</span>
                              <strong style={{ fontFamily: "monospace" }}>{isCapturingHardware ? `${hardwareStats.lidarHz} Hz` : "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                              <span>已收包数:</span>
                              <strong style={{ fontFamily: "monospace" }}>{isCapturingHardware ? formatNumber(hardwareStats.lidarPackets) : "-"}</strong>
                            </div>
                          </div>

                          {/* Camera stats */}
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "10px", display: "grid", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>{t.sensorName}</span>
                            <strong style={{ fontSize: "14px", color: "#0f172a" }}>Camera ({cameraMode.toUpperCase()})</strong>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                              <span>{t.sensorHz}:</span>
                              <strong style={{ fontFamily: "monospace" }}>{isCapturingHardware ? `${hardwareStats.cameraHz} FPS` : "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                              <span>传输延迟:</span>
                              <strong style={{ fontFamily: "monospace" }}>{isCapturingHardware ? `${hardwareStats.cameraLatency} ms` : "-"}</strong>
                            </div>
                          </div>

                          {/* IMU stats */}
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "10px", display: "grid", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>{t.sensorName}</span>
                            <strong style={{ fontSize: "14px", color: "#0f172a" }}>IMU ({imuPort})</strong>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                              <span>{t.sensorHz}:</span>
                              <strong style={{ fontFamily: "monospace" }}>{isCapturingHardware ? `${hardwareStats.imuHz} Hz` : "-"}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569" }}>
                              <span>已收包数:</span>
                              <strong style={{ fontFamily: "monospace" }}>{isCapturingHardware ? formatNumber(hardwareStats.imuPackets) : "-"}</strong>
                            </div>
                          </div>

                        </div>
                      </section>

                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: 数据体检 */}
              {activeTab === "inspect" && (
                <div style={{ maxWidth: "900px", margin: "0 auto", width: "100%", display: "grid", gap: "20px" }}>
                  {inspection ? (
                    <>
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <span className="eyebrow">{t.navInspect}</span>
                            <h2>{t.inspectTitle}</h2>
                          </div>
                          <Gauge size={22} />
                        </div>

                        <div className="stream-grid">
                          {streamCards.map((card) => (
                            <StreamCard key={card.label} icon={card.icon} label={card.label} stream={card.data} t={t} />
                          ))}
                        </div>
                      </section>

                      <section className="panel">
                        <div className="alignment-card" style={{ border: 0, boxShadow: "none", padding: 0, background: "transparent" }}>
                          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", color: "#1e1b17" }}>
                            <GitCompare size={18} style={{ color: "#2a776f" }} />
                            {t.alignment}
                          </h3>
                          <div className="alignment-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                            <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(38, 35, 30, 0.08)" }}>
                              <Fact label={t.sameStart} value={boolText(inspection.alignment.sameStartTime, t)} />
                            </div>
                            <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(38, 35, 30, 0.08)" }}>
                              <Fact label={t.aligned} value={boolText(inspection.alignment.timeAligned, t)} />
                            </div>
                            <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(38, 35, 30, 0.08)", gridColumn: "span 2" }}>
                              <Fact
                                label={t.maxStartOffset}
                                value={inspection.alignment.maxStartOffsetMs === null ? "-" : `${inspection.alignment.maxStartOffsetMs} ms`}
                              />
                            </div>
                            <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(38, 35, 30, 0.08)", gridColumn: "span 2" }}>
                              <Fact label={t.note} value={inspection.alignment.note} />
                            </div>
                          </div>
                        </div>
                      </section>

                      {inspection.warnings.length > 0 ? (
                        <div className="alert" style={{ background: "rgba(154, 111, 35, 0.08)" }}>
                          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                          <div>
                            <strong>{t.warnings}</strong>
                            {inspection.warnings.map((warning) => (
                              <p key={warning} style={{ margin: "4px 0 0 0", fontSize: "13px" }}>{warning}</p>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                        <button className="primary" onClick={() => setActiveTab("run")} style={{ height: "42px", padding: "0 20px" }}>
                          <span>去配置算法运行</span>
                          <Settings2 size={16} style={{ marginLeft: "6px" }} />
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Beautiful Empty State if data is not loaded yet */
                    <div className="panel" style={{ padding: "40px 20px", textAlign: "center" }}>
                      <Gauge size={48} style={{ color: "#756f65", margin: "0 auto 16px auto", opacity: 0.5 }} />
                      <h3 style={{ fontSize: "17px", color: "#4a453d", margin: "0 0 8px 0" }}>
                        {language === "zh" ? "尚未读取数据集信息" : "No Dataset Inspected"}
                      </h3>
                      <p className="muted" style={{ marginBottom: "20px", fontSize: "13px" }}>
                        {language === "zh" 
                          ? "请先在【数据准备】页面选择文件夹或rosbag，并进行分析读取。" 
                          : "Please select 'Data Setup' first to select and inspect dataset files."}
                      </p>
                      <button className="primary" onClick={() => setActiveTab("prepare")} style={{ margin: "0 auto", height: "40px" }}>
                        <Upload size={16} />
                        {language === "zh" ? "去准备数据" : "Go to Data Setup"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: 运行配置 */}
              {activeTab === "run" && (
                <div className="content-grid" style={{ maxWidth: "1080px", margin: "0 auto", width: "100%", gridTemplateColumns: "minmax(0, 1.25fr) 1fr" }}>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">{t.navRun}</span>
                        <h2>{t.runTitle}</h2>
                      </div>
                      <Server size={22} />
                    </div>
                    <p className="muted">{t.runText}</p>

                    <div className="segmented">
                      <button
                        className={config.algorithmMode === "remote" ? "active" : ""}
                        onClick={() => setConfig((current) => ({ ...current, algorithmMode: "remote" }))}
                      >
                        {t.remoteMode}
                      </button>
                      <button
                        className={config.algorithmMode === "local" ? "active" : ""}
                        onClick={() => setConfig((current) => ({ ...current, algorithmMode: "local" }))}
                      >
                        {t.localMode}
                      </button>
                    </div>

                    {config.algorithmMode === "remote" && (
                      <div className="segmented" style={{ marginTop: "12px", marginBottom: "8px" }}>
                        <button
                          type="button"
                          className={connectionType === "tunnel" ? "active" : ""}
                          onClick={() => setConnectionType("tunnel")}
                          style={{ fontSize: "12px", padding: "6px 12px", height: "32px", minHeight: "auto" }}
                        >
                          {t.tunnelMode}
                        </button>
                        <button
                          type="button"
                          className={connectionType === "custom" ? "active" : ""}
                          onClick={() => setConnectionType("custom")}
                          style={{ fontSize: "12px", padding: "6px 12px", height: "32px", minHeight: "auto" }}
                        >
                          {t.customMode}
                        </button>
                      </div>
                    )}

                    <label className="field">
                      <span>{t.endpoint}</span>
                      <input
                        disabled={config.algorithmMode === "local" || (config.algorithmMode === "remote" && connectionType === "tunnel")}
                        value={config.remoteEndpoint}
                        onChange={(event) => setConfig((current) => ({ ...current, remoteEndpoint: event.target.value }))}
                        style={{
                          background: (config.algorithmMode === "local" || (config.algorithmMode === "remote" && connectionType === "tunnel")) ? "rgba(0,0,0,0.03)" : "#fffdf8"
                        }}
                      />
                    </label>

                    {config.algorithmMode === "remote" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px", border: "1px solid rgba(38, 35, 30, 0.08)", padding: "14px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.35)", marginBottom: "12px" }}>
                        <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <h3 style={{ fontSize: "13px", fontWeight: "bold", margin: 0, color: "#1e1b17", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Server size={15} style={{ color: "#2a776f" }} />
                            <span>远程服务器 SSH 与桥接配置</span>
                          </h3>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setShowGuideModal(true)}
                            style={{
                              fontSize: "11px",
                              padding: "4px 8px",
                              height: "auto",
                              minHeight: "auto",
                              borderColor: "#2a776f",
                              color: "#2a776f",
                              background: "transparent",
                              fontWeight: "bold",
                              borderRadius: "4px"
                            }}
                          >
                            {t.deploymentTutorial}
                          </button>
                        </div>
                        
                        {savedConnections.length > 0 && (
                          <div style={{ gridColumn: "span 2", marginBottom: "4px" }}>
                            <label className="field" style={{ margin: 0 }}>
                              <span>{t.historyTitle}</span>
                              <select
                                onChange={(e) => {
                                  const index = Number(e.target.value);
                                  if (index >= 0 && index < savedConnections.length) {
                                    const selected = savedConnections[index];
                                    setConfig((curr) => ({
                                      ...curr,
                                      sshHost: selected.host,
                                      sshPort: selected.port,
                                      sshUsername: selected.username
                                    }));
                                  }
                                }}
                                style={{
                                  background: "#fffdf8",
                                  width: "100%",
                                  height: "38px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(38, 35, 30, 0.12)",
                                  padding: "0 10px",
                                  fontSize: "12px",
                                  color: "#1e1b17",
                                  outline: "none"
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>{t.historyPlaceholder}</option>
                                {savedConnections.map((conn, idx) => (
                                  <option key={idx} value={idx}>
                                    {`${conn.username}@${conn.host}:${conn.port}`}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}
                        
                        <label className="field" style={{ margin: 0 }}>
                          <span>{t.sshHost}</span>
                          <input
                            value={config.sshHost || ""}
                            onChange={(e) => setConfig((current) => ({ ...current, sshHost: e.target.value }))}
                            style={{ background: "#fffdf8" }}
                          />
                        </label>

                        <label className="field" style={{ margin: 0 }}>
                          <span>{t.sshPort}</span>
                          <input
                            type="number"
                            value={config.sshPort || 22}
                            onChange={(e) => setConfig((current) => ({ ...current, sshPort: Number(e.target.value) }))}
                            style={{ background: "#fffdf8" }}
                          />
                        </label>

                        <label className="field" style={{ margin: 0 }}>
                          <span>{t.sshUsername}</span>
                          <input
                            value={config.sshUsername || ""}
                            onChange={(e) => setConfig((current) => ({ ...current, sshUsername: e.target.value }))}
                            style={{ background: "#fffdf8" }}
                          />
                        </label>

                        <label className="field" style={{ margin: 0 }}>
                          <span>{t.sshPassword}</span>
                          <input
                            type="password"
                            value={config.sshPassword || ""}
                            onChange={(e) => setConfig((current) => ({ ...current, sshPassword: e.target.value }))}
                            style={{ background: "#fffdf8" }}
                          />
                        </label>

                        {connectionType === "tunnel" && (
                          <div style={{
                            gridColumn: "span 2",
                            background: "rgba(42, 119, 111, 0.04)",
                            border: "1px dashed rgba(42, 119, 111, 0.3)",
                            borderRadius: "6px",
                            padding: "10px 12px",
                            fontSize: "12px",
                            color: "#1e1b17",
                            marginTop: "4px"
                          }}>
                            <span style={{ fontWeight: "bold", display: "block", marginBottom: "6px", color: "#2a776f" }}>
                              🔗 {t.tunnelHint}
                            </span>
                            <div style={{
                              background: "#1e1b17",
                              color: "#a9a59f",
                              padding: "8px 10px",
                              borderRadius: "4px",
                              fontFamily: "monospace",
                              wordBreak: "break-all",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "8px"
                            }}>
                              <span style={{ userSelect: "all" }}>
                                {`ssh -CNg -L 8000:127.0.0.1:8000 -p ${config.sshPort || 22} ${config.sshUsername || "root"}@${config.sshHost || "connect.westc.seetacloud.com"}`}
                              </span>
                              <button
                                type="button"
                                className="primary"
                                onClick={() => {
                                  const cmd = `ssh -CNg -L 8000:127.0.0.1:8000 -p ${config.sshPort || 22} ${config.sshUsername || "root"}@${config.sshHost || "connect.westc.seetacloud.com"}`;
                                  navigator.clipboard.writeText(cmd);
                                  setIsCopied(true);
                                  setTimeout(() => setIsCopied(false), 2000);
                                }}
                                style={{
                                  fontSize: "10px",
                                  padding: "4px 8px",
                                  height: "auto",
                                  minHeight: "auto",
                                  flexShrink: 0,
                                  background: isCopied ? "#1e6f47" : "#2a776f",
                                  borderColor: isCopied ? "#1e6f47" : "#2a776f",
                                  color: "#fff"
                                }}
                              >
                                {isCopied ? t.commandCopied : t.copyCommand}
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
                          <button 
                            type="button"
                            className="secondary" 
                            disabled={isTestingConnection} 
                            onClick={handleTestConnection}
                            style={{ height: "38px", fontSize: "12px", width: "100%", fontWeight: "bold" }}
                          >
                            <RefreshCw size={13} className={isTestingConnection ? "animate-spin" : ""} style={{ marginRight: "6px" }} />
                            <span>{isTestingConnection ? t.testingConnection : t.testConnectionBtn}</span>
                          </button>

                          {connectionTestResult && (
                            <div style={{ 
                              padding: "10px 12px", 
                              borderRadius: "6px", 
                              border: `1px solid ${connectionTestResult.success ? "rgba(30, 111, 71, 0.2)" : "rgba(143, 45, 30, 0.2)"}`,
                              background: connectionTestResult.success ? "rgba(30, 111, 71, 0.04)" : "rgba(143, 45, 30, 0.04)",
                              fontSize: "12px"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", color: connectionTestResult.success ? "#1e6f47" : "#8f2d1e" }}>
                                {connectionTestResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                <span>{connectionTestResult.success ? t.testSuccess : t.testFailed}</span>
                              </div>
                              <div style={{ marginTop: "6px", color: "#4a453d", display: "grid", gap: "4px", paddingLeft: "22px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: connectionTestResult.ssh.success ? "#1e6f47" : "#8f2d1e" }}></span>
                                  <span>{connectionTestResult.ssh.success ? t.sshOk : `${t.sshError} (${connectionTestResult.ssh.message})`}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: connectionTestResult.api.success ? "#1e6f47" : "#8f2d1e" }}></span>
                                  <span>{connectionTestResult.api.success ? t.apiOk : `${t.apiError} (${connectionTestResult.api.message})`}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ 
                      border: "1px solid rgba(38, 35, 30, 0.08)", 
                      borderRadius: "8px", 
                      padding: "14px 16px",
                      background: config.useGroundTruth ? "rgba(42, 119, 111, 0.03)" : "transparent",
                      transition: "background 0.2s"
                    }}>
                      <label className="check-row" style={{ cursor: "pointer", color: "#1e1b17" }}>
                        <input
                          type="checkbox"
                          checked={config.useGroundTruth}
                          onChange={(event) => setConfig((current) => ({ ...current, useGroundTruth: event.target.checked }))}
                        />
                        <span>{t.compare}</span>
                      </label>
                      <p className="muted" style={{ fontSize: "12px", marginTop: "6px", marginLeft: "22px" }}>{t.compareText}</p>

                      {config.useGroundTruth && (
                        <div style={{ marginLeft: "22px", marginTop: "12px", display: "grid", gap: "10px" }}>
                          <button className="secondary" onClick={chooseGroundTruth} style={{ alignSelf: "start", height: "36px", fontSize: "12px" }}>
                            <Route size={16} />
                            {t.chooseTruth}
                          </button>
                          <div className="path-box compact" style={{ minHeight: "52px", padding: "8px 12px" }}>
                            <span>{t.truthPath}</span>
                            <strong style={{ fontSize: "12px", color: "#1e1b17" }}>{config.groundTruthPath || t.notSelected}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", marginTop: "8px" }}>
                      <button 
                        className="primary" 
                        disabled={!canStart} 
                        onClick={handleStartProject}
                        style={{ minWidth: "150px", height: "44px", fontSize: "14px", fontWeight: "bold" }}
                      >
                        <Play size={16} />
                        {t.start}
                      </button>
                      {!canStart && (
                        <span style={{ fontSize: "11px", color: "#8f2d1e" }}>
                          * {t.startDisabled}
                        </span>
                      )}
                    </div>
                  </section>

                  <section className="panel architecture" style={{ height: "fit-content" }}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e1b17" }}>
                      <GitCompare size={18} style={{ color: "#2a776f" }} />
                      {t.architecture}
                    </h2>
                    <Advice icon={<Settings2 size={18} />} text={t.localAdvice} />
                    <Advice icon={<Server size={18} />} text={t.remoteAdvice} />
                    <Advice icon={<GitCompare size={18} />} text={t.hybridAdvice} />
                  </section>
                </div>
              )}

            </div>
          </>
        )}
      {showGuideModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(30, 27, 23, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "650px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "85vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(38,35,30,0.08)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#1e1b17", display: "flex", alignItems: "center", gap: "8px" }}>
                <Server size={18} style={{ color: "#2a776f" }} />
                <span>{t.deploymentTitle}</span>
              </h2>
              <button
                onClick={() => {
                  setShowGuideModal(false);
                  setExportSuccessMsg("");
                  setExportErrorMsg("");
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#756f65",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", color: "#4a453d", lineHeight: "1.6" }}>
              <div>
                <strong style={{ color: "#1e1b17", display: "block", marginBottom: "4px" }}>
                  第一步：一键导出服务器部署包 (本地 Windows 电脑)
                </strong>
                <p style={{ margin: "0 0 10px 0" }}>点击下方按钮，选择本地的一个空文件夹（例如桌面上的新文件夹），一键导出为云端环境深度优化的 Python 桥接程序。</p>
                <button
                  className="primary"
                  onClick={handleExportBridge}
                  disabled={isExporting}
                  style={{ height: "38px", fontSize: "12px" }}
                >
                  <RefreshCw size={14} className={isExporting ? "animate-spin" : ""} style={{ marginRight: "6px" }} />
                  {isExporting ? t.exportingBridge : t.exportBridgeBtn}
                </button>
                {exportSuccessMsg && (
                  <div className="alert success" style={{ marginTop: "10px", padding: "10px", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                    {exportSuccessMsg}
                  </div>
                )}
                {exportErrorMsg && (
                  <div className="alert danger" style={{ marginTop: "10px", padding: "10px", fontSize: "12px" }}>
                    {exportErrorMsg}
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px dashed rgba(38,35,30,0.08)", paddingTop: "14px" }}>
                <strong style={{ color: "#1e1b17", display: "block", marginBottom: "4px" }}>
                  第二步：拖拽上传至云服务器 (AutoDL / 云 GPU 主机)
                </strong>
                <p style={{ margin: "0 0 4px 0" }}>1. 打开您习惯的远程工具（如 FileZilla 或 SecureCRT），以 SSH 连接到您的云服务器（如 `Host: connect.westc.seetacloud.com`，`Port: 47606`）。</p>
                <p style={{ margin: 0 }}>2. 将导出的 3 个文件（`main.py`、`converter.py`、`requirements.txt`）上传至服务器的 **`/root/ros_bridge/`** 目录中（如果没有此目录可以手动创建）。</p>
              </div>

              <div style={{ borderTop: "1px dashed rgba(38,35,30,0.08)", paddingTop: "14px" }}>
                <strong style={{ color: "#1e1b17", display: "block", marginBottom: "4px" }}>
                  第三步：在云服务器中运行服务 (二选一)
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0, 0, 0, 0.02)", padding: "12px", borderRadius: "6px", marginTop: "4px" }}>
                  <div>
                    <span style={{ fontWeight: "bold", color: "#2a776f" }}>🚀 推荐：方案 B (使用 AutoDL 公网端口映射)</span>
                    <p style={{ margin: "2px 0 6px 0" }}>在服务器终端直接指定 6006 端口启动服务：</p>
                    <code style={{ background: "#1e1b17", color: "#a9a59f", padding: "6px 8px", borderRadius: "4px", display: "block", fontFamily: "monospace" }}>
                      source activate base && cd /root/ros_bridge && python main.py 6006
                    </code>
                  </div>
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "8px" }}>
                    <span style={{ fontWeight: "bold", color: "#756f65" }}>🔒 方案 A (使用 SSH 端口转发隧道)</span>
                    <p style={{ margin: "2px 0 6px 0" }}>如果不开放公网端口，则在服务器端以默认 8000 端口启动：</p>
                    <code style={{ background: "#1e1b17", color: "#a9a59f", padding: "6px 8px", borderRadius: "4px", display: "block", fontFamily: "monospace" }}>
                      source activate base && cd /root/ros_bridge && python main.py
                    </code>
                    <p style={{ margin: "6px 0 0 0" }}>并且在您本地电脑的终端里建立 SSH 隧道（点击界面上的复制按钮获取完整指令）。</p>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px dashed rgba(38,35,30,0.08)", paddingTop: "14px" }}>
                <strong style={{ color: "#1e1b17", display: "block", marginBottom: "4px" }}>
                  第四步：配置完成，一键测试！
                </strong>
                <p style={{ margin: 0 }}>在桌面控制台输入对应的地址（例如方案 B 填公网映射网址，方案 A 填 `http://127.0.0.1:8000`），填好 SSH 密码后点击连接测试，绿灯亮起即可完美享受！</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowGuideModal(false);
                setExportSuccessMsg("");
                setExportErrorMsg("");
              }}
              style={{
                marginTop: "20px",
                width: "100%",
                height: "40px",
                background: "#2a776f",
                borderColor: "#2a776f",
                color: "#fff",
                fontWeight: "bold",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              {t.closeGuide}
            </button>
          </div>
        </div>
      )}
      {showWalkthroughModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "600px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "85vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={18} style={{ color: "#0d9488" }} />
                <span>{language === "zh" ? "系统更新日志 (V0.1.8)" : "Release Notes (V0.1.8)"}</span>
              </h2>
              <button
                onClick={() => setShowWalkthroughModal(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
              <p style={{ margin: 0, fontWeight: "bold", color: "#0f172a" }}>
                {language === "zh" ? "控制台全新优化及功能迭代已发布：" : "Console optimizations and iterations successfully deployed:"}
              </p>

              <div style={{ display: "grid", gap: "12px" }}>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0f172a" }}>1. 🎨 Apple/Stripe 极清亮色主题</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>全新升级清爽空气感亮白主题，配以极其精密的细致网格及 Apple 水准高感光投影，彻底解决暗色低对比度反差问题。</p>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0f172a" }}>2. 🌟 双功能“数据准备”合一</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>“读取离线数据包”与“实时接收硬件数据”在同一个面板内一键切换，完美适应离线算法演示与实机传感数据抓取。</p>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0f172a" }}>3. 📡 物理级多传感器硬件采集</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>支持高精度配置 LiDAR 目标 IP/UDP 端口、Camera 连接模式（USB/GigE/RTSP 地址及 FPS）以及 IMU 物理串口 COM 波特率，并支持高保真高频数据遥测模拟看板。</p>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ color: "#0f172a" }}>4. ⚙️ “格式转换”快捷微端化</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>移除了原侧边栏庞大单独选项卡，直接收纳到离线包读取右侧作为精美弹窗，界面极其清爽简约。</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowWalkthroughModal(false)}
              style={{
                marginTop: "20px",
                width: "100%",
                height: "40px",
                background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                borderColor: "#0d9488",
                color: "#fff",
                fontWeight: "bold",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              {language === "zh" ? "我知道了" : "Got it"}
            </button>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 99999,
          padding: "20px"
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
            padding: "24px",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <RefreshCw size={18} style={{ color: "#0d9488" }} />
                <span>{language === "zh" ? "检测到新版本发布！" : "New Software Update!"}</span>
              </h2>
              <button
                onClick={() => {
                  if (!isUpdating) setShowUpdateModal(false);
                }}
                disabled={isUpdating}
                style={{
                  background: "transparent",
                  border: 0,
                  fontSize: "20px",
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6", display: "grid", gap: "10px" }}>
              <p style={{ margin: 0 }}>
                {language === "zh" 
                  ? `软件开发者已发布最新稳定版 V${latestVersion}，建议您立即升级以获得更优的功能体验与底层稳定性。`
                  : `A new stable release V${latestVersion} has been successfully dispatched. Update now to enjoy high telemetry speeds & improved frame rates.`}
              </p>

              <div style={{ display: "flex", gap: "16px", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "12px", justifyContent: "space-around", margin: "4px 0" }}>
                <div>
                  <span style={{ color: "#94a3b8" }}>{language === "zh" ? "当前版本: " : "Current: "}</span>
                  <strong style={{ color: "#475569" }}>V{currentVersion}</strong>
                </div>
                <div style={{ borderLeft: "1px solid #cbd5e1" }}></div>
                <div>
                  <span style={{ color: "#0d9488" }}>{language === "zh" ? "最新版本: " : "Latest: "}</span>
                  <strong style={{ color: "#0d9488" }}>V{latestVersion}</strong>
                </div>
              </div>

              {isUpdating ? (
                <div style={{ display: "grid", gap: "6px", marginTop: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#0d9488" }}>
                    {language === "zh" ? "正在下载更新资源包..." : "Downloading latest assets..."}
                  </span>
                  <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", background: "#0d9488", borderRadius: "3px", animation: "mockProgress 2.2s infinite ease-in-out" }}></div>
                  </div>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                    {language === "zh" ? "校验哈希: SHA-256 [A3F8B...9C021]" : "Hash verification: SHA-256 [A3F8B...9C021]"}
                  </span>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                disabled={isUpdating}
                onClick={() => setShowUpdateModal(false)}
                style={{
                  flex: 1,
                  height: "38px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "12px",
                  color: "#475569",
                  cursor: isUpdating ? "not-allowed" : "pointer"
                }}
              >
                {language === "zh" ? "暂不更新" : "Later"}
              </button>

              <button
                disabled={isUpdating}
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    // Trigger actual updater download from GitHub Releases
                    if (window.desktop?.restartAndInstall) {
                      await window.desktop.restartAndInstall();
                    } else {
                      // Fallback relaunch for dev/demo mode
                      setTimeout(() => {
                        setIsUpdating(false);
                        setShowUpdateModal(false);
                        setHasUpdate(false);
                        alert(language === "zh" ? "本地演示更新已完成，请手动重启软件。" : "Demo update finished, please manually restart.");
                      }, 2000);
                    }
                  } catch (e: any) {
                    console.error("Failed to execute autoupdater", e);
                    setIsUpdating(false);
                    alert(language === "zh" ? `更新出错: ${e.message}` : `Update error: ${e.message}`);
                  }
                }}
                style={{
                  flex: 1,
                  height: "38px",
                  background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                  border: "1px solid #0d9488",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "12px",
                  color: "#fff",
                  cursor: isUpdating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
                <span>{isUpdating ? (language === "zh" ? "正在从GitHub下载..." : "Downloading...") : (language === "zh" ? "现在重启并更新" : "Restart & Update")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

function StreamCard({
  icon,
  label,
  stream,
  t
}: {
  icon: React.ReactNode;
  label: string;
  stream: SensorStreamSummary;
  t: (typeof copy)[Language];
}) {
  const statusText = stream.status === "ready" ? t.ready : stream.status === "missing" ? t.missing : t.unknown;
  return (
    <article className="stream-card">
      <div className="stream-title">
        <span>{icon}</span>
        <strong>{label}</strong>
        <em className={stream.status}>{statusText}</em>
      </div>
      <div className="fact-list">
        <Fact label={t.frames} value={formatNumber(stream.count)} />
        <Fact label={t.frequency} value={formatFrequency(stream.frequencyHz)} />
        <Fact label={t.firstTime} value={formatTimestamp(stream.firstTimestamp)} />
        <Fact label={t.lastTime} value={formatTimestamp(stream.lastTimestamp)} />
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Advice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="advice">
      <span>{icon}</span>
      <p>{text}</p>
    </div>
  );
}
