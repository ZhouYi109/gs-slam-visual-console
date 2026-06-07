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
    offset_x = offset_y = offset_z = None
    for field in msg.fields:
        if field.name == 'x': offset_x = field.offset
        if field.name == 'y': offset_y = field.offset
        if field.name == 'z': offset_z = field.offset
    
    if offset_x is None or offset_y is None or offset_z is None:
        return []

    try:
        data_bytes = bytes(msg.data)
        num_points = msg.width * msg.height
        if len(data_bytes) < num_points * msg.point_step:
            num_points = len(data_bytes) // msg.point_step
        
        if num_points == 0:
            return []
            
        data = np.frombuffer(data_bytes, dtype=np.uint8)[:num_points * msg.point_step]
        grid = data.reshape((num_points, msg.point_step))
        
        x_bytes = grid[:, offset_x:offset_x+4].copy()
        y_bytes = grid[:, offset_y:offset_y+4].copy()
        z_bytes = grid[:, offset_z:offset_z+4].copy()
        
        x = x_bytes.view(dtype=np.float32)
        y = y_bytes.view(dtype=np.float32)
        z = z_bytes.view(dtype=np.float32)
        
        pts = np.column_stack((x, y, z))
        return pts.tolist()
    except Exception as e:
        points = []
        for i in range(msg.width * msg.height):
            base = i * msg.point_step
            try:
                x = struct.unpack_from('<f', msg.data, base + offset_x)[0]
                y = struct.unpack_from('<f', msg.data, base + offset_y)[0]
                z = struct.unpack_from('<f', msg.data, base + offset_z)[0]
                points.append((x, y, z))
            except Exception:
                pass
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
        with open(filepath, 'wb') as f:
            header = (
                "# .PCD v0.7 - Point Cloud Data file format\n"
                "VERSION 0.7\n"
                "FIELDS x y z\n"
                "SIZE 4 4 4\n"
                "TYPE F F F\n"
                "COUNT 1 1 1\n"
                f"WIDTH {len(pts)}\n"
                "HEIGHT 1\n"
                "VIEWPOINT 0 0 0 1 0 0 0\n"
                f"POINTS {len(pts)}\n"
                "DATA binary\n"
            )
            f.write(header.encode('ascii'))
            f.write(pts.tobytes())

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
                    stamp = msg.header.stamp
                    if hasattr(stamp, 'sec') and hasattr(stamp, 'nanosec'):
                        t_sec = stamp.sec + stamp.nanosec / 1e9
                    elif hasattr(stamp, 'secs') and hasattr(stamp, 'nsecs'):
                        t_sec = stamp.secs + stamp.nsecs / 1e9
                
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
    import shutil
    from rosbags.typesys import Stores, get_typestore
    
    source_path = Path(req.sourcePath)
    output_path = Path(req.outputPath)
    
    is_ros1 = output_path.suffix == '.bag'
    
    if is_ros1:
        if output_path.exists():
            output_path.unlink()
    else:
        if output_path.exists():
            if output_path.is_dir():
                shutil.rmtree(output_path)
            else:
                output_path.unlink()

    if is_ros1:
        from rosbags.rosbag1 import Writer
        typestore = get_typestore(Stores.ROS1_NOETIC)
    else:
        from rosbags.rosbag2 import Writer
        typestore = get_typestore(Stores.LATEST)
        
    Time = typestore.types['builtin_interfaces/msg/Time']
    Header = typestore.types['std_msgs/msg/Header']
    Image = typestore.types['sensor_msgs/msg/Image']
    Imu = typestore.types['sensor_msgs/msg/Imu']
    PointCloud2 = typestore.types['sensor_msgs/msg/PointCloud2']
    PointField = typestore.types['sensor_msgs/msg/PointField']
    Vector3 = typestore.types['geometry_msgs/msg/Vector3']
    Quaternion = typestore.types['geometry_msgs/msg/Quaternion']

    items = []
    
    img_dir = source_path / "images"
    if img_dir.exists():
        for f in img_dir.iterdir():
            if f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
                try:
                    t_sec = float(f.stem)
                    t_ns = int(t_sec * 1e9)
                    items.append((t_ns, 'image', f))
                except Exception:
                    pass
                    
    lidar_dir = source_path / "lidar"
    if lidar_dir.exists():
        for f in lidar_dir.iterdir():
            if f.suffix.lower() in ['.pcd', '.bin', '.txt']:
                try:
                    t_sec = float(f.stem)
                    t_ns = int(t_sec * 1e9)
                    items.append((t_ns, 'lidar', f))
                except Exception:
                    pass
                    
    imu_csv = source_path / "imu.csv"
    if imu_csv.exists():
        with open(imu_csv, 'r') as f:
            reader_csv = csv.reader(f)
            header_row = next(reader_csv, None)
            if header_row and header_row[0].strip().lower() != 'timestamp':
                try:
                    t_sec = float(header_row[0])
                    t_ns = int(t_sec * 1e9)
                    items.append((t_ns, 'imu', [t_sec] + [float(x) for x in header_row[1:]]))
                except Exception:
                    pass
            for row in reader_csv:
                if not row or not row[0]:
                    continue
                try:
                    t_sec = float(row[0])
                    t_ns = int(t_sec * 1e9)
                    items.append((t_ns, 'imu', [t_sec] + [float(x) for x in row[1:]]))
                except Exception:
                    pass
                    
    if not items:
        raise Exception("No data items found in the source directory.")
        
    items.sort(key=lambda x: x[0])
    
    img_msgtype = Image.__msgtype__
    imu_msgtype = Imu.__msgtype__
    lidar_msgtype = PointCloud2.__msgtype__
    
    if is_ros1:
        img_msgtype_conn = "sensor_msgs/Image"
        imu_msgtype_conn = "sensor_msgs/Imu"
        lidar_msgtype_conn = "sensor_msgs/PointCloud2"
    else:
        img_msgtype_conn = img_msgtype
        imu_msgtype_conn = imu_msgtype
        lidar_msgtype_conn = lidar_msgtype

    with Writer(output_path) as writer:
        conn_img = writer.add_connection('/camera/image_raw', img_msgtype_conn, typestore=typestore)
        conn_imu = writer.add_connection('/imu/data', imu_msgtype_conn, typestore=typestore)
        conn_lidar = writer.add_connection('/velodyne_points', lidar_msgtype_conn, typestore=typestore)
        
        seq = 0
        
        def make_header(t_ns):
            sec = t_ns // 1000000000
            nanosec = t_ns % 1000000000
            stamp = Time(sec=sec, nanosec=nanosec)
            if 'seq' in Header.__annotations__:
                nonlocal seq
                seq += 1
                return Header(seq=seq, stamp=stamp, frame_id="world")
            return Header(stamp=stamp, frame_id="world")
            
        for t_ns, itype, payload in items:
            if itype == 'image':
                img_mat = cv2.imread(str(payload))
                if img_mat is None:
                    continue
                h, w, c = img_mat.shape
                encoding = "bgr8" if c == 3 else "mono8"
                step = w * c
                data_np = np.frombuffer(img_mat.tobytes(), dtype=np.uint8)
                
                msg = Image(
                    header=make_header(t_ns),
                    height=h,
                    width=w,
                    encoding=encoding,
                    is_bigendian=0,
                    step=step,
                    data=data_np
                )
                
                if is_ros1:
                    serialized = typestore.serialize_ros1(msg, img_msgtype)
                else:
                    from rosbags.serde import serialize_cdr
                    serialized = serialize_cdr(msg, img_msgtype, typestore=typestore)
                writer.write(conn_img, t_ns, serialized)
                
            elif itype == 'imu':
                cov_zero = np.zeros(9, dtype=np.float64)
                
                msg = Imu(
                    header=make_header(t_ns),
                    orientation=Quaternion(x=0.0, y=0.0, z=0.0, w=1.0),
                    orientation_covariance=cov_zero,
                    angular_velocity=Vector3(x=payload[4], y=payload[5], z=payload[6]),
                    angular_velocity_covariance=cov_zero,
                    linear_acceleration=Vector3(x=payload[1], y=payload[2], z=payload[3]),
                    linear_acceleration_covariance=cov_zero
                )
                
                if is_ros1:
                    serialized = typestore.serialize_ros1(msg, imu_msgtype)
                else:
                    from rosbags.serde import serialize_cdr
                    serialized = serialize_cdr(msg, imu_msgtype, typestore=typestore)
                writer.write(conn_imu, t_ns, serialized)
                
            elif itype == 'lidar':
                pts_list = []
                f_path = str(payload)
                ext = payload.suffix.lower()
                if ext == '.bin':
                    pts_np = np.fromfile(f_path, dtype=np.float32)
                    if len(pts_np) % 3 == 0:
                        pts_list = pts_np.reshape((-1, 3)).tolist()
                    elif len(pts_np) % 4 == 0:
                        pts_list = pts_np.reshape((-1, 4))[:, :3].tolist()
                elif ext == '.txt':
                    try:
                        pts_np = np.loadtxt(f_path, delimiter=' ')
                        pts_list = pts_np[:, :3].tolist()
                    except Exception:
                        pass
                elif ext == '.pcd':
                    try:
                        with open(f_path, 'rb') as pf:
                            lines = []
                            is_binary = False
                            num_pts_pcd = 0
                            for line in pf:
                                line_str = line.decode('ascii', errors='ignore').strip()
                                lines.append(line_str)
                                if line_str.startswith('POINTS'):
                                    num_pts_pcd = int(line_str.split()[1])
                                if line_str.startswith('DATA'):
                                    if line_str.split()[1] == 'binary':
                                        is_binary = True
                                    break
                            if is_binary:
                                pts_bytes = pf.read()
                                pts_np = np.frombuffer(pts_bytes, dtype=np.float32)[:num_pts_pcd * 3]
                                pts_list = pts_np.reshape((-1, 3)).tolist()
                            else:
                                pts_p = []
                                for line in pf:
                                    line_str = line.decode('ascii', errors='ignore').strip()
                                    if not line_str:
                                        continue
                                    parts = line_str.split()
                                    if len(parts) >= 3:
                                        pts_p.append((float(parts[0]), float(parts[1]), float(parts[2])))
                                pts_list = pts_p
                    except Exception:
                        pass
                        
                if not pts_list:
                    continue
                    
                pts_np = np.array(pts_list, dtype=np.float32)
                num_pts = len(pts_np)
                data_bytes = pts_np.tobytes()
                data_np = np.frombuffer(data_bytes, dtype=np.uint8)
                
                fields = [
                    PointField(name='x', offset=0, datatype=7, count=1),
                    PointField(name='y', offset=4, datatype=7, count=1),
                    PointField(name='z', offset=8, datatype=7, count=1),
                ]
                
                msg = PointCloud2(
                    header=make_header(t_ns),
                    height=1,
                    width=num_pts,
                    fields=fields,
                    is_bigendian=False,
                    point_step=12,
                    row_step=num_pts * 12,
                    data=data_np,
                    is_dense=True
                )
                
                if is_ros1:
                    serialized = typestore.serialize_ros1(msg, lidar_msgtype)
                else:
                    from rosbags.serde import serialize_cdr
                    serialized = serialize_cdr(msg, lidar_msgtype, typestore=typestore)
                writer.write(conn_lidar, t_ns, serialized)
                
    return True
