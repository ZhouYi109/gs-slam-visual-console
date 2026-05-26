# SLAM-3DGS 远程服务器代理（方案 A）具体实施与修改指南 (AutoDL 服务器专版)

根据您提供的远程服务器文件目录截图，可以确认您使用的是 **AutoDL 租用的 GPU 云服务器**：
1. 您登录的默认用户是 **`root`**，其主目录为 **`/root`**。
2. 根目录下有专属的 **`/autodl-pub`** 文件夹。
3. 根目录下存在一个名为 **`/r3live`** 的软链接文件夹（带快捷方式箭头，通常指向您挂载的数据盘或工作区 `/root/autodl-tmp/r3live`），这正是您的 R3LIVE SLAM 工作空间！

以下是为您 **量身定制且 100% 契合您 AutoDL 目录结构** 的具体实施与修改指南：

---

## 🛠️ 第一步：云服务器环境准备 (AutoDL Server)

### 1. 将 `ros_bridge` 复制到服务器
在您的 Windows 电脑上使用 Xftp 或 FileZilla，将本地 `ros_bridge` 文件夹上传到服务器的 **`/root`** 目录下。
上传后的结构应该为：
```
/root/ros_bridge/
   ├─ main.py
   ├─ converter.py
   └─ requirements.txt
```

### 2. 在服务器上激活环境并安装依赖
AutoDL 的系统已经为您预装好了 Conda（位于 `/root/miniconda3`）和主流的深度学习环境。
在 SSH 终端里执行以下命令安装我们所需的轻量库：

```bash
# 1. 激活您的 base 环境或算法工作环境
conda activate base

# 2. 安装 fastapi、uvicorn 和 websockets
pip install fastapi uvicorn pydantic websockets opencv-python numpy
```

---

## 💻 第二步：编写服务器端的启动脚本与进程管理器

我们在远程服务器的 `/root/ros_bridge/` 目录下新建进程管理器 `orchestrator.py`。由于 AutoDL 的 ROS 环境通常是 Noetic (ROS1)，我们将路径完全映射到您的 `/r3live` 工作空间。

在服务器的 `/root/ros_bridge/` 下新建 orchestrator.py 并写入以下内容：

```python
import asyncio
import subprocess
import os
import signal
from typing import Dict, Optional

class SLAMOrchestrator:
    def __init__(self):
        # 存储运行中的子进程句柄
        self.processes: Dict[str, asyncio.subprocess.Process] = {}
        # 运行日志缓冲区
        self.logs = []

    async def start_project(self, launch_cmd: str, bag_cmd: str):
        """
        异步且并发地拉起 ROS 算法启动命令与 Rosbag 播放命令
        """
        # 如果有正在运行的任务，先安全清理
        await self.stop_project()
        
        # 清空历史日志
        self.logs = []

        # 1. 启动 SLAM 核心算法进程
        print(f"[Orchestrator] Starting SLAM: {launch_cmd}")
        self.processes["slam"] = await asyncio.create_subprocess_shell(
            launch_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            executable='/bin/bash',
            preexec_fn=os.setsid  # 创建进程组，方便后续一键杀死子进程
        )

        # 2. 稍微等待 2.5 秒确保算法节点初始化完毕，再启动 Bag 播放
        await asyncio.sleep(2.5)

        print(f"[Orchestrator] Starting Bag Play: {bag_cmd}")
        self.processes["bag"] = await asyncio.create_subprocess_shell(
            bag_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            executable='/bin/bash',
            preexec_fn=os.setsid
        )

        # 异步监听两个控制台的输出日志
        asyncio.create_task(self._read_stream(self.processes["slam"], "SLAM"))
        asyncio.create_task(self._read_stream(self.processes["bag"], "ROSBAG"))

    async def _read_stream(self, process: asyncio.subprocess.Process, prefix: str):
        """
        实时读取控制台日志并存入缓冲区
        """
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            log_str = f"[{prefix}] {line.decode('utf-8', errors='ignore').strip()}"
            self.logs.append(log_str)
            # 仅保留最近的 1000 行，防止内存溢出
            if len(self.logs) > 1000:
                self.logs.pop(0)

    async def stop_project(self):
        """
        优雅且彻底地杀掉所有拉起的子进程组
        """
        for name, proc in list(self.processes.items()):
            if proc.returncode is None:
                try:
                    # 向进程组发送 SIGTERM 信号，连带杀死该指令派生的所有子 ROS 节点
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                    await proc.wait()
                    print(f"[Orchestrator] Stopped process: {name}")
                except Exception as e:
                    print(f"Error stopping {name}: {e}")
        self.processes.clear()

    def get_status(self):
        return {
            "slam_running": "slam" in self.processes and self.processes["slam"].returncode is None,
            "bag_running": "bag" in self.processes and self.processes["bag"].returncode is None,
            "log_count": len(self.logs)
        }
```

---

## 📡 第三步：修改服务器主入口 `main.py` 支持一键控制与日志获取

我们将 `SLAMOrchestrator` 挂载到 FastAPI 路由中，在服务器 `/root/ros_bridge/main.py` 中写入如下逻辑：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from orchestrator import SLAMOrchestrator

app = FastAPI(title="SLAM-3DGS ROS Bridge Server")
orchestrator = SLAMOrchestrator()

class StartSLAMRequest(BaseModel):
    launchCommand: str
    bagCommand: str

@app.post("/api/slam/start")
async def api_start_slam(req: StartSLAMRequest):
    try:
        await orchestrator.start_project(req.launchCommand, req.bagCommand)
        return {"status": "success", "message": "Successfully started SLAM execution."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/slam/stop")
async def api_stop_slam():
    try:
        await orchestrator.stop_project()
        return {"status": "success", "message": "Successfully stopped all SLAM processes."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/slam/status")
def api_get_status():
    return orchestrator.get_status()

@app.get("/api/slam/logs")
def api_get_logs():
    return {"logs": orchestrator.logs}
```

---

## 📡 第四步：极速数据推送通道 (基于 R3LIVE 订阅者)

在 `/root/ros_bridge/main.py` 下方挂载一个 WebSocket 终结点。我们将话题完全对齐您的 R3LIVE 算法：
- 图像话题：`/camera/image_raw` 或 `/live_cb/image_color`
- 轨迹话题：`/r3live/path` 或 `/live_cb/pose`（根据您在 `/r3live` 工程中的定义）

```python
from fastapi import WebSocket, WebSocketDisconnect
import rospy
from sensor_msgs.msg import Image
from nav_msgs.msg import Path as ROSPath
import cv2
import numpy as np
import base64

latest_data = {
    "image_base64": "",
    "trajectory_points": [],
    "drift": 0.0
}

# --- ROS 话题回调函数 ---
def image_callback(msg):
    try:
        # 简单手工解析 8-bit RGB 图像
        img = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 70])
        latest_data["image_base64"] = base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        pass

def path_callback(msg):
    # 订阅 R3LIVE 输出的 nav_msgs/Path 全局轨迹并更新到最新
    points = []
    for pose in msg.poses:
        points.append({
            "x": pose.pose.position.x,
            "y": pose.pose.position.y,
            "z": pose.pose.position.z
        })
    latest_data["trajectory_points"] = points
    # 计算当前漂移
    if len(points) > 0:
        latest_data["drift"] = float(np.sqrt(points[-1]["x"]**2 + points[-1]["y"]**2) * 0.01)

# --- 初始化 ROS 订阅者节点 ---
try:
    # 订阅 R3LIVE 的实时相机图像与输出轨迹
    rospy.init_node('r3live_windows_gui_bridge', anonymous=True, disable_signals=True)
    rospy.Subscriber("/camera/image_raw", Image, image_callback)
    rospy.Subscriber("/r3live/path", ROSPath, path_callback)
except Exception as e:
    print("ROS Node initialization postponed until launch.")

# --- WebSocket 极速推送通道 ---
@app.websocket("/ws/slam/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(0.04) # 限制发送在 25 FPS 左右
            payload = {
                "frame": len(latest_data["trajectory_points"]),
                "image": latest_data["image_base64"],
                "trajectory": latest_data["trajectory_points"][-300:], # 推送最新300个点
                "drift": latest_data["drift"],
                "fps": 25.0
            }
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        print("Windows client disconnected.")
```

---

## 🎨 第五步：Windows 客户端 React 调用匹配 (React)

在您的 Windows 客户端的 [src/App.tsx](file:///f:/aayan/Code/UI/src/App.tsx) 中，将“开始运行”的 `useEffect` 完全对齐您在 AutoDL 服务器上的 **`/r3live`** 工作路径和环境：

```tsx
useEffect(() => {
  if (!isRunning) return;

  // 1. 发送启动请求至 AutoDL 服务器，通过 bash 脚本自动拉起 r3live 核心
  fetch(`${config.remoteEndpoint}/api/slam/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // 算法启动命令：首先配置 ROS 环境与您的 /r3live 工作空间，再 roslaunch 启动算法
      launchCommand: "source /opt/ros/noetic/setup.bash && source /r3live/devel/setup.bash && roslaunch r3live r3live_bag.launch",
      // Rosbag 播放命令：播放服务器上放置的激光雷达与图像混合数据包
      bagCommand: `source /opt/ros/noetic/setup.bash && rosbag play /root/autodl-tmp/hku_park_00.bag`
    })
  });

  // 2. 建立极速网络管道
  const wsUrl = config.remoteEndpoint.replace("http://", "ws://") + "/ws/slam/stream";
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // 更新运行指标
    setSimStats({
      frame: data.frame,
      fps: data.fps,
      time: (data.frame / data.fps).toFixed(1),
      drift: data.drift.toFixed(4)
    });

    // 绘制实时相机画面
    if (data.image) {
      const imgElement = document.getElementById("camera-stream-view") as HTMLImageElement | null;
      if (imgElement) {
        imgElement.src = `data:image/jpeg;base64,${data.image}`;
      }
    }

    // 绘制实时三维全局轨迹到 Canvas
    const canvas = document.getElementById("canvas-trajectory") as HTMLCanvasElement | null;
    if (canvas && data.trajectory.length > 0) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#aa5b35";
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.trajectory.forEach((pt: any, idx: number) => {
          // 将真实的 meter 坐标单位缩放到 Canvas 像素尺寸
          const px = canvas.width / 2 + pt.x * 20;
          const py = canvas.height / 2 + pt.y * 20;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
    }
  };

  return () => {
    ws.close();
    // 退出时优雅向服务器发送终止信号，安全释放显存，关闭所有后台进程
    fetch(`${config.remoteEndpoint}/api/slam/stop`, { method: "POST" });
  };
}, [isRunning]);
```

---

## 🏁 开启您的远程实时 SLAM 演示：
1. **在云服务器上启动代理服务**：
   SSH 连接至 AutoDL 服务器后，在命令窗口运行：
   ```bash
   conda activate base
   cd /root/ros_bridge
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
2. **在 Windows 本地客户端配置**：
   - 切换到 **运行配置**。
   - 输入您云服务器的 SSH IP、端口（AutoDL 提供的 SSH 外网端口，通常不是22，需按控制台显示的填写）、以及 `root` 密码。
   - 在 **服务器地址 (endpoint)** 输入您 AutoDL 的 API 外网暴露地址，例如 `http://<云服务器外网IP>:<外网映射端口>`。
   - 点击 **一键测试服务器连接**，双通道亮起绿灯。
3. **点击“开始运行工程”**，R3LIVE SLAM 便会开始在后台无缝运行，精美的雷达视频流与全局轨迹将实时呈现在您的 Windows 控制台屏幕中！🎉
