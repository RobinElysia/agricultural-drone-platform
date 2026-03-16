# yolo-smart-system

当前项目只保留 3 个本地视频检测功能：

- 人体检测
- 虫害检测
- 火灾检测

## 项目结构

- `video_detect.py`：主运行脚本
- `detector.py`：模型加载、帧检测、画框逻辑
- `models/pest.pt`：虫害检测模型
- `models/fire.pt`：火灾检测模型
- `yolov8n.pt`：人体检测模型
- `people.mp4`：人体检测视频
- `pest.mp4`：虫害检测视频
- `fire.mp4`：火灾检测视频

## 安装依赖

```bash
pip install -r requirements.txt
```

## 运行命令

```bash
python video_detect.py --mode person --source people.mp4
python video_detect.py --mode pest --source pest.mp4
python video_detect.py --mode fire --source fire.mp4
```

## 说明

- 只读取本地视频文件，不使用摄像头，不使用网页上传。
- 默认每 3 帧检测 1 次，其余帧复用上一次结果。
- 按 `q` 键退出窗口。
