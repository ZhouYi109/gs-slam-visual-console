import os
import csv
import struct
import numpy as np
import cv2
from pathlib import Path
from rosbags.highlevel import AnyReader
from pydantic import BaseModel

class ConvertBagToFolderRequest(BaseModel):
    sourcePath: str
    outputPath: str
    imageFormat: str
    lidarFormat: str

def _decode_image(msg, msgtype):
    if msgtype == 'sensor_msgs/msg/CompressedImage':
        np_arr = np.frombuffer(msg.data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    elif msgtype == 'sensor_msgs/msg/Image':
        if msg.encoding in ['rgb8', 'bgr8']:
            img = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
            if msg.encoding == 'rgb8':
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            return img
        elif msg.encoding == 'mono8':
            img = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width))
            return img
    return None

def _decode_pointcloud2(msg):
    points = []
    offset_x = offset_y = offset_z = None
    for field in msg.fields:
        if field.name == 'x': offset_x = field.offset
        if field.name == 'y': offset_y = field.offset
        if field.name == 'z': offset_z = field.offset
    
    if offset_x is None or offset_y is None or offset_z is None:
        return []

    for i in range(msg.width * msg.height):
        base = i * msg.point_step
        x = struct.unpack_from('<f', msg.data, base + offset_x)[0]
        y = struct.unpack_from('<f', msg.data, base + offset_y)[0]
        z = struct.unpack_from('<f', msg.data, base + offset_z)[0]
        points.append((x, y, z))
    return points

def _decode_livox_custom(msg):
    points = []
    for p in msg.points:
        points.append((p.x, p.y, p.z))
    return points

def _write_lidar(points, filepath, fmt):
    if len(points) == 0:
        return
    pts = np.array(points, dtype=np.float32)
    if fmt == '.bin':
        pts.tofile(filepath)
    elif fmt == '.txt':
        np.savetxt(filepath, pts, fmt='%.6f', delimiter=' ')
    elif fmt == '.pcd':
        with open(filepath, 'w') as f:
            f.write("# .PCD v0.7 - Point Cloud Data file format\n")
            f.write("VERSION 0.7\n")
            f.write("FIELDS x y z\n")
            f.write("SIZE 4 4 4\n")
            f.write("TYPE F F F\n")
            f.write("COUNT 1 1 1\n")
            f.write(f"WIDTH {len(pts)}\n")
            f.write("HEIGHT 1\n")
            f.write("VIEWPOINT 0 0 0 1 0 0 0\n")
            f.write(f"POINTS {len(pts)}\n")
            f.write("DATA ascii\n")
            for p in pts:
                f.write(f"{p[0]:.6f} {p[1]:.6f} {p[2]:.6f}\n")

def convert_bag_to_folder(req: ConvertBagToFolderRequest):
    bag_path = Path(req.sourcePath)
    out_path = Path(req.outputPath)
    
    if not bag_path.exists():
        raise Exception("Source bag does not exist")
        
    out_path.mkdir(parents=True, exist_ok=True)
    img_dir = out_path / "images"
    lidar_dir = out_path / "lidar"
    img_dir.mkdir(exist_ok=True)
    lidar_dir.mkdir(exist_ok=True)
    
    imu_csv_path = out_path / "imu.csv"
    
    IMAGE_TOPICS = {"sensor_msgs/msg/Image", "sensor_msgs/msg/CompressedImage"}
    IMU_TOPICS = {"sensor_msgs/msg/Imu"}
    LIDAR_TOPICS = {
        "sensor_msgs/msg/PointCloud2",
        "livox_ros_driver/msg/CustomMsg",
        "livox_ros_driver2/msg/CustomMsg"
    }

    with AnyReader([bag_path]) as reader:
        imu_f = open(imu_csv_path, 'w', newline='')
        imu_writer = csv.writer(imu_f)
        imu_writer.writerow(['timestamp', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'])
        
        for connection, timestamp, rawdata in reader.messages():
            msgtype = connection.msgtype
            try:
                msg = reader.deserialize(rawdata, connection.msgtype)
                
                t_sec = timestamp / 1e9
                if hasattr(msg, 'header') and hasattr(msg.header, 'stamp'):
                    t_sec = msg.header.stamp.sec + msg.header.stamp.nanosec / 1e9
                
                if msgtype in IMAGE_TOPICS:
                    img = _decode_image(msg, msgtype)
                    if img is not None:
                        cv2.imwrite(str(img_dir / f"{t_sec:.6f}{req.imageFormat}"), img)
                        
                elif msgtype in IMU_TOPICS:
                    ax, ay, az = msg.linear_acceleration.x, msg.linear_acceleration.y, msg.linear_acceleration.z
                    gx, gy, gz = msg.angular_velocity.x, msg.angular_velocity.y, msg.angular_velocity.z
                    imu_writer.writerow([f"{t_sec:.6f}", ax, ay, az, gx, gy, gz])
                    
                elif msgtype in LIDAR_TOPICS:
                    pts = []
                    if msgtype == 'sensor_msgs/msg/PointCloud2':
                        pts = _decode_pointcloud2(msg)
                    elif msgtype in ['livox_ros_driver/msg/CustomMsg', 'livox_ros_driver2/msg/CustomMsg']:
                        pts = _decode_livox_custom(msg)
                    
                    if len(pts) > 0:
                        _write_lidar(pts, str(lidar_dir / f"{t_sec:.6f}{req.lidarFormat}"), req.lidarFormat)
                        
            except Exception as e:
                pass
                
        imu_f.close()
    return True

class ConvertFolderToBagRequest(BaseModel):
    sourcePath: str
    outputPath: str

def convert_folder_to_bag(req: ConvertFolderToBagRequest):
    # This is a complex operation requiring encoding back to ROS types.
    # A full implementation requires manually assembling byte buffers for PointCloud2.
    raise Exception("Folder to Bag conversion is under development and will be available in the next iteration.")
