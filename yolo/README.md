# yolo

当前目录已整合两套能力：

- 本地视频检测：人体、虫害、火灾
- Web 图片检测：虫害、火灾、管理员人脸认证

## 主要文件

- `video_detect.py`：本地视频检测入口
- `app.py`：Flask Web 服务入口
- `detector.py`：统一的 YOLO 检测封装
- `face_auth.py`：管理员 LBPH 人脸认证
- `debug_predict.py`：单张图片快速调试
- `templates/index.html`：Web 页面模板

## 安装依赖

```bash
pip install -r requirements.txt
```

## 运行 Web 服务

```bash
python app.py
```

浏览器访问：`http://127.0.0.1:5000`

## 运行本地视频检测

```bash
python video_detect.py --mode person --source people.mp4
python video_detect.py --mode pest --source pest.mp4
python video_detect.py --mode fire --source fire.mp4
```

## 单图调试

```bash
python debug_predict.py --model models/pest.pt --image test.jpg --conf 0.05 --imgsz 960
```

## 说明

- `models/` 下保留虫害和火灾模型。
- `admin_faces/` 用于管理员人脸样本、标签和训练结果。
- `static/uploads/` 和 `static/results/` 会自动生成。
- 视频检测仍然只读取本地视频文件，不使用摄像头。
