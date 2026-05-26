import asyncio
import os
import signal
import base64
import csv
import struct
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

# 尝试导入 rospy (在远程 AutoDL ROS 环境下会成功加载；在本地 Windows 下会优雅回退防止报错)
HAS_ROS = False
try:
    import rospy
    import rosgraph
    from sensor_msgs.msg import Image
    from nav_msgs.msg import Path as ROSPath
    HAS_ROS = True
except ImportError:
    print("[Warning] rospy or ROS message packages not found. Running in dev/mock mode.")

# 尝试导入 cv2
HAS_CV2 = False
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    print("[Warning] opencv-python not found. Image streaming will be disabled.")

app = FastAPI(title="SLAM-3DGS AutoDL ROS Bridge Server")

# 允许跨域请求联调
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. 进程管理器 (SLAMOrchestrator)
# ==========================================
class SLAMOrchestrator:
    def __init__(self):
        # 存储后台正在运行的虚拟终端子进程组句柄
        self.processes: Dict[str, asyncio.subprocess.Process] = {}
        # 日志缓冲区
        self.logs: List[str] = []

    async def start_project(self, launch_cmd: str, bag_cmd: str):
        """
        异步并发拉起算法主程序与数据包播放命令
        """
        # 清理已存在的进程
        await self.stop_project()
        self.logs = []

        print(f"[Orchestrator] Starting SLAM Core: {launch_cmd}")
        # 启动 SLAM 算法核心进程并绑定进程组 (os.setsid)
        self.processes["slam"] = await asyncio.create_subprocess_shell(
            launch_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            executable='/bin/bash',
            preexec_fn=os.setsid
        )

        # 延时 2.5 秒确保核心节点初始化完毕，再播放 Rosbag
        await asyncio.sleep(2.5)

        print(f"[Orchestrator] Starting ROS Bag Play: {bag_cmd}")
        self.processes["bag"] = await asyncio.create_subprocess_shell(
            bag_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            executable='/bin/bash',
            preexec_fn=os.setsid
        )

        # 并发启动监听任务，将输出实时捕获到日志缓冲区
        asyncio.create_task(self._read_stream(self.processes["slam"], "SLAM"))
        asyncio.create_task(self._read_stream(self.processes["bag"], "ROSBAG"))

    async def _read_stream(self, process: asyncio.subprocess.Process, prefix: str):
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            log_str = f"[{prefix}] {line.decode('utf-8', errors='ignore').strip()}"
            self.logs.append(log_str)
            if len(self.logs) > 1000:
                self.logs.pop(0)

    async def stop_project(self):
        """
        通过进程组 SIGTERM 信号彻底杀死所有子 ROS 节点，完美释放 GPU 显存
        """
        for name, proc in list(self.processes.items()):
            if proc.returncode is None:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                    await proc.wait()
                    print(f"[Orchestrator] Stopped process group: {name}")
                except Exception as e:
                    print(f"Error stopping process group {name}: {e}")
        self.processes.clear()

    def get_status(self):
        return {
            "slam_running": "slam" in self.processes and self.processes["slam"].returncode is None,
            "bag_running": "bag" in self.processes and self.processes["bag"].returncode is None,
            "log_count": len(self.logs)
        }

orchestrator = SLAMOrchestrator()

# ==========================================
# 2. 全局实时传感器数据缓冲区
# ==========================================
latest_sensor_data = {
    "image_base64": "",
    "trajectory_points": [],
    "drift": 0.0
}

# ==========================================
# 3. ROS 话题监听与解码回调
# ==========================================
if HAS_ROS:
    def image_callback(msg: Image):
        """
        监听 ROS 相机图像，并压缩为 JPG Base64 极速直推
        """
        if not HAS_CV2:
            return
        try:
            # 8-bit RGB 原始数据转换为 numpy 矩阵
            img = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
            # 转换 RGB 为 BGR 格式以适配 OpenCV 压缩
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            # 图像压缩率设定为 70% 保证流畅传输
            _, buffer = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
            latest_sensor_data["image_base64"] = base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            pass

    def path_callback(msg: ROSPath):
        """
        订阅 R3LIVE 输出的 nav_msgs/Path 全局实时运动轨迹
        """
        points = []
        for pose in msg.poses:
            points.append({
                "x": pose.pose.position.x,
                "y": pose.pose.position.y,
                "z": pose.pose.position.z
            })
        latest_sensor_data["trajectory_points"] = points
        # 实时计算当前坐标到起点的位移作为漂移参考
        if len(points) > 0:
            latest_sensor_data["drift"] = float(np.sqrt(points[-1]["x"]**2 + points[-1]["y"]**2) * 0.01)

    async def ros_master_monitor():
        """
        后台监控 ROS Master 状态，避免在 Master 未运行前 rospy.init_node 阻塞主进程
        """
        print("[ROS] Starting background ROS Master monitor...")
        is_initialized = False
        while True:
            try:
                if not is_initialized:
                    if rosgraph.is_master_online():
                        print("[ROS] ROS Master detected online! Initializing rospy node...")
                        rospy.init_node('r3live_windows_gui_bridge', anonymous=True, disable_signals=True)
                        rospy.Subscriber("/camera/image_raw", Image, image_callback)
                        rospy.Subscriber("/r3live/path", ROSPath, path_callback)
                        print("[ROS] Subscribers successfully registered to topics.")
                        is_initialized = True
                else:
                    if not rosgraph.is_master_online():
                        print("[ROS] ROS Master went offline. Resetting state.")
                        is_initialized = False
            except Exception as e:
                print(f"[ROS] Exception in ROS monitor loop: {e}")
            await asyncio.sleep(2.0)

    @app.on_event("startup")
    async def startup_event():
        asyncio.create_task(ros_master_monitor())

# ==========================================
# 4. HTTP API 控制接口
# ==========================================
class StartSLAMRequest(BaseModel):
    launchCommand: str
    bagCommand: str

@app.get("/api/health")
def health_check():
    return {"status": "success", "ok": True, "service": "ros_bridge_server"}

@app.post("/api/slam/start")
async def api_start_slam(req: StartSLAMRequest):
    try:
        await orchestrator.start_project(req.launchCommand, req.bagCommand)
        return {"status": "success", "message": "Successfully started SLAM processes."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/slam/stop")
async def api_stop_slam():
    try:
        await orchestrator.stop_project()
        return {"status": "success", "message": "Successfully stopped SLAM processes."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/slam/status")
def api_get_status():
    return orchestrator.get_status()

@app.get("/api/slam/logs")
def api_get_logs():
    return {"logs": orchestrator.logs}

# ==========================================
# 5. WebSocket 高频实时数据流直推通道
# ==========================================
@app.websocket("/ws/slam/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[WebSocket] Client connected.")
    try:
        while True:
            # 限制数据包发送速率在 25 FPS 左右，防止撑爆网络带宽
            await asyncio.sleep(0.04)
            
            # 若处于非 ROS 开发环境 (Mock 调试)，则生成美丽的无穷大双环仿真轨迹和漂移数据
            if not HAS_ROS or len(latest_sensor_data["trajectory_points"]) == 0:
                elapsed = asyncio.get_event_loop().time()
                mock_points = []
                for i in range(100):
                    t = elapsed + (i * 0.05)
                    x = 10 * np.sin(t)
                    y = 5 * np.sin(2 * t)
                    mock_points.append({"x": x, "y": y, "z": 0.0})
                
                payload = {
                    "frame": int(elapsed * 25),
                    "image": latest_sensor_data["image_base64"],  # 保留可能通过转换上传的图像
                    "trajectory": mock_points,
                    "drift": float(0.002 * elapsed),
                    "fps": 25.0
                }
            else:
                # 真实 ROS 数据流直推
                payload = {
                    "frame": len(latest_sensor_data["trajectory_points"]),
                    "image": latest_sensor_data["image_base64"],
                    "trajectory": latest_sensor_data["trajectory_points"][-300:],  # 推送最新 300 个点
                    "drift": latest_sensor_data["drift"],
                    "fps": 25.0
                }
            
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected.")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")

if __name__ == "__main__":
    import uvicorn
    import sys
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    print(f"[Start] Running FastAPI server on 0.0.0.0:{port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
