# yolo-smart-system（比赛版：图片上传）

## 功能

- **虫害识别**：上传图片 → YOLO 检测 → 返回画框结果图 + JSON 详情
- **火灾识别**：上传图片 → YOLO 检测 → 返回画框结果图 + JSON 详情
- **管理员认证（人脸）**：上传人脸图片登录（OpenCV LBPH，无需摄像头）

## 目录约定

- `models/pest.pt`：虫害识别权重（你提供）
- `models/fire.pt`：火灾识别权重（你提供）
- `admin_faces/`：管理员人脸库（放多张图片，建议命名 `name_1.jpg`、`name_2.jpg`…）
- `static/uploads/`：上传图片（自动生成）
- `static/results/`：检测结果图片（自动生成）

## 安装与运行（Windows）

在项目根目录：

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

浏览器打开：`http://127.0.0.1:5000`

## 重要说明

1. 首次使用请把权重文件放到 `models/` 下：`pest.pt`、`fire.pt`。
2. 如果你只有一个模型，也可以用环境变量让两个任务共用同一个权重：

```bash
set PEST_MODEL=models\\your.pt
set FIRE_MODEL=models\\your.pt
python app.py
```

3. 管理员认证流程：
   - 把管理员照片放进 `admin_faces/`
   - 在网页点“训练管理员人脸库”
   - 上传管理员正脸照片登录

