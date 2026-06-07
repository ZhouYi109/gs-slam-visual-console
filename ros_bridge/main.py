from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rosbags.highlevel import AnyReader
from pathlib import Path
from datetime import datetime
import math
from converter import convert_bag_to_folder, ConvertBagToFolderRequest, convert_folder_to_bag, ConvertFolderToBagRequest

app = FastAPI(title="SLAM-3DGS ROS Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks = {}

def run_conversion_task(task_id: str, req: ConvertBagToFolderRequest):
    try:
        tasks[task_id] = {"status": "processing", "message": "Converting bag..."}
        convert_bag_to_folder(req)
        tasks[task_id] = {"status": "success", "message": "Successfully converted bag to folder."}
    except Exception as e:
        tasks[task_id] = {"status": "failed", "message": f"Conversion failed: {str(e)}"}

class InspectRequest(BaseModel):
    sourcePath: str

def empty_stream(name: str, status: str = "missing"):
    return {
        "name": name,
        "count": 0,
        "frequencyHz": None,
        "firstTimestamp": None,
        "lastTimestamp": None,
        "status": status
    }

IMAGE_TOPICS = {"sensor_msgs/msg/Image", "sensor_msgs/msg/CompressedImage"}
IMU_TOPICS = {"sensor_msgs/msg/Imu"}
LIDAR_TOPICS = {
    "sensor_msgs/msg/PointCloud2",
    "sensor_msgs/msg/LaserScan",
    "livox_ros_driver/msg/CustomMsg",
    "livox_ros_driver2/msg/CustomMsg",
    "sensor_msgs/msg/PointCloud"
}

@app.get("/api/health")
def health_check():
    return {"ok": True, "service": "ros_bridge"}

@app.post("/api/dataset/inspect")
def inspect_dataset(req: InspectRequest):
    bag_path = Path(req.sourcePath)
    if not bag_path.exists():
        raise HTTPException(status_code=400, detail="File or directory does not exist")
        
    try:
        # AnyReader works with both ROS1 (.bag) and ROS2 (.db3, .mcap) folders or files
        with AnyReader([bag_path]) as reader:
            connections = reader.connections
            
            image_conns = []
            imu_conns = []
            lidar_conns = []
            
            # Map topics to sensor types
            for conn in connections:
                msg_type = conn.msgtype
                if msg_type in IMAGE_TOPICS:
                    image_conns.append(conn)
                elif msg_type in IMU_TOPICS:
                    imu_conns.append(conn)
                elif msg_type in LIDAR_TOPICS:
                    lidar_conns.append(conn)
                    
            bag_start = reader.start_time / 1e9 if reader.start_time else 0
            bag_end = reader.end_time / 1e9 if reader.end_time else 0
            bag_duration = bag_end - bag_start

            def build_stream(name, conns):
                count = sum(c.msgcount for c in conns)
                if count == 0:
                    return empty_stream(name, "missing")
                
                freq = round((count - 1) / bag_duration, 2) if bag_duration > 0 and count > 1 else None
                return {
                    "name": name,
                    "count": count,
                    "frequencyHz": freq,
                    "firstTimestamp": round(bag_start, 3),
                    "lastTimestamp": round(bag_end, 3),
                    "status": "ready"
                }

            image = build_stream("Image", image_conns)
            imu = build_stream("IMU", imu_conns)
            lidar = build_stream("LiDAR", lidar_conns)
            
            # Alignment logic
            streams = [s for s in [image, imu, lidar] if s["status"] == "ready" and s["firstTimestamp"] is not None]
            if len(streams) < 2:
                alignment = {
                    "sameStartTime": None,
                    "timeAligned": None,
                    "maxStartOffsetMs": None,
                    "maxNearestOffsetMs": None,
                    "note": "At least two streams need timestamps before alignment can be judged."
                }
            else:
                starts = [s["firstTimestamp"] for s in streams]
                max_offset_ms = round((max(starts) - min(starts)) * 1000)
                time_aligned = max_offset_ms <= 50
                alignment = {
                    "sameStartTime": max_offset_ms == 0,
                    "timeAligned": time_aligned,
                    "maxStartOffsetMs": max_offset_ms,
                    "maxNearestOffsetMs": None,
                    "note": "Stream start times are within 50 ms." if time_aligned else "Stream start times differ by more than 50 ms."
                }

            return {
                "id": "bag-" + str(int(datetime.now().timestamp())),
                "sourcePath": req.sourcePath,
                "sourceKind": "rosbag",
                "inspectedAt": datetime.now().isoformat(),
                "image": image,
                "imu": imu,
                "lidar": lidar,
                "alignment": alignment,
                "warnings": []
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse bag file: {str(e)}")

@app.post("/api/convert/bag_to_folder")
def api_convert_bag_to_folder(req: ConvertBagToFolderRequest, background_tasks: BackgroundTasks):
    task_id = "bag_to_folder_" + str(int(datetime.now().timestamp()))
    tasks[task_id] = {"status": "processing", "message": "Starting conversion..."}
    background_tasks.add_task(run_conversion_task, task_id, req)
    return {"status": "processing", "taskId": task_id}

@app.get("/api/convert/status")
def get_convert_status(taskId: str):
    if taskId not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[taskId]

def run_folder_to_bag_task(task_id: str, req: ConvertFolderToBagRequest):
    try:
        tasks[task_id] = {"status": "processing", "message": "Converting folder..."}
        convert_folder_to_bag(req)
        tasks[task_id] = {"status": "success", "message": "Successfully converted folder to bag."}
    except Exception as e:
        tasks[task_id] = {"status": "failed", "message": f"Conversion failed: {str(e)}"}

@app.post("/api/convert/folder_to_bag")
def api_convert_folder_to_bag(req: ConvertFolderToBagRequest, background_tasks: BackgroundTasks):
    task_id = "folder_to_bag_" + str(int(datetime.now().timestamp()))
    tasks[task_id] = {"status": "processing", "message": "Starting conversion..."}
    background_tasks.add_task(run_folder_to_bag_task, task_id, req)
    return {"status": "processing", "taskId": task_id}

if __name__ == "__main__":
    import uvicorn
    # Allow running directly via python main.py
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
