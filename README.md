# 3DGS-SLAM Visual Console

一个中英双语桌面端 3DGS-SLAM 可视化控制台。

当前版本已完成算法运行前界面：

- 选择数据集文件夹
- 选择 rosbag / db3 / mcap 文件
- 扫描图片、IMU 文本、点云帧
- 展示数量、频率、起止时间
- 判断多传感器开始时间和时间对齐状态
- 配置是否启用真值轨迹对照实验
- 支持本机运行 / 服务器运行两种算法后端模式的 UI 配置

## 开发运行

```bash
npm.cmd run dev
```

## 类型检查

```bash
npm.cmd run typecheck
```

## 打包免安装版

```bash
npm.cmd run build
```

免安装版输出到：

```text
release/win-unpacked
```

## 后续算法运行建议

推荐做混合架构：桌面端内置轻量数据检查与可视化，3DGS-SLAM 算法通过本机或远程服务提供统一接口。远程服务更适合 GPU/ROS/PCL/CUDA 依赖较重的工程。
