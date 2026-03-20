from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

# 用于记录 ultralytics 导入失败时的异常信息
IMPORT_ERROR: Exception | None = None


def _ensure_lzma_support() -> None:
    """确保标准库中的 lzma 模块可用，否则 ultralytics 无法导入。"""
    try:
        import lzma  # noqa: F401
    except Exception as exc:
        raise RuntimeError(
            "Python 缺少 lzma/_lzma 支持，因此无法导入 ultralytics。"
            "Ubuntu 修复方法：安装 xz-utils 和 liblzma-dev，重新编译/安装 Python，"
            "然后重新安装项目依赖。"
            f"原始错误：{exc}"
        ) from exc


# 在导入 ultralytics 之前先检查 lzma 支持
_ensure_lzma_support()

try:
    from ultralytics import YOLO
except Exception as e:  # pragma: no cover
    YOLO = None  # type: ignore
    IMPORT_ERROR = e  # 保存导入错误，供后续提示使用


# 项目根目录（当前文件所在目录）
BASE_DIR = Path(__file__).resolve().parent
# COCO 数据集中"人"的类别 ID
PERSON_CLASS_ID = 0


def _ensure_numpy_compat_for_yolo() -> None:
    """检查 NumPy 版本兼容性：当前 torch/ultralytics 依赖 NumPy 1.x。"""
    # 若设置了环境变量 YOLO_ALLOW_NUMPY2，则跳过版本检查
    if os.environ.get("YOLO_ALLOW_NUMPY2", "").strip().lower() in {"1", "true", "yes", "on"}:
        return
    major = int(str(np.__version__).split(".", 1)[0])
    if major >= 2:
        raise RuntimeError(
            "检测到 NumPy 2.x，但当前 torch/ultralytics 运行时需要 NumPy 1.x。"
            "请运行：pip install \"numpy<2\" --upgrade --force-reinstall"
        )


# 模块加载时立即执行 NumPy 版本检查
_ensure_numpy_compat_for_yolo()


@dataclass(frozen=True)
class Detection:
    """单个目标检测结果（不可变数据类）。"""
    label: str                              # 检测到的类别名称
    confidence: float                       # 置信度（0~1）
    xyxy: Tuple[int, int, int, int]         # 边界框坐标：(x1, y1, x2, y2)
    class_id: Optional[int] = None          # 类别 ID（对应模型的 names 字典）


# 各检测模式的配置字典
MODE_CONFIG = {
    "person": {
        "model": BASE_DIR / "yolov8n.pt",   # 使用通用 YOLOv8n 模型
        "classes": [PERSON_CLASS_ID],        # 仅检测"人"这一类别
        "conf": 0.25,                        # 置信度阈值
        "iou": 0.45,                         # NMS IoU 阈值
        "imgsz": 640,                        # 推理图像尺寸
        "frame_interval": 3,                 # 每隔 3 帧推理一次（节省算力）
        "window": "Detection - person",      # 显示窗口标题
        "box_color": (0, 255, 0),            # 边界框颜色（BGR：绿色）
        "text_color": (0, 0, 0),             # 标签文字颜色（BGR：黑色）
    },
    "pest": {
        "model": BASE_DIR / "models" / "pest.pt",  # 害虫专用模型
        "classes": None,                            # 检测所有类别
        "conf": 0.18,                               # 较低置信度阈值（提高召回率）
        "iou": 0.45,
        "imgsz": 960,                               # 较大输入尺寸（改善小目标检测）
        "frame_interval": 1,                        # 每帧都推理
        "window": "Detection - pest",
        "box_color": (0, 215, 255),                 # 边界框颜色（BGR：金黄色）
        "text_color": (20, 20, 20),
    },
    "fire": {
        "model": BASE_DIR / "models" / "fire.pt",  # 火焰检测专用模型
        "classes": None,
        "conf": 0.08,                               # 非常低的置信度阈值（宁可误报也不漏报）
        "iou": 0.50,
        "imgsz": 960,
        "frame_interval": 1,
        "window": "Detection - fire",
        "box_color": (0, 0, 255),                   # 边界框颜色（BGR：红色）
        "text_color": (255, 255, 255),              # 标签文字颜色（BGR：白色）
    },
}


def _require_yolo() -> None:
    """若 YOLO 未成功导入，则抛出带有详细说明的运行时错误。"""
    if YOLO is None:  # pragma: no cover
        base_message = "ultralytics 未安装或无法导入。"
        if IMPORT_ERROR is not None and "_lzma" in str(IMPORT_ERROR):
            base_message = (
                "ultralytics 导入失败，原因是 Python 缺少 _lzma 支持。"
                "在 Ubuntu 上，请安装 xz-utils 和 liblzma-dev，重新编译 Python，然后重新安装依赖。"
            )
        raise RuntimeError(f"{base_message} 原始错误：{IMPORT_ERROR}")


class VideoDetector:
    """
    视频流目标检测器。

    支持三种模式：person（人体）、pest（害虫）、fire（火焰）。
    每种模式使用独立的 YOLO 权重文件和推理参数。
    """

    def __init__(
        self,
        mode: str,
        device: str | None = None,   # 推理设备，如 "cpu"、"cuda:0"，None 表示自动选择
        conf: float | None = None,   # 覆盖默认置信度阈值
        iou: float | None = None,    # 覆盖默认 IoU 阈值
    ):
        _require_yolo()
        if mode not in MODE_CONFIG:
            raise ValueError(f"不支持的检测模式：{mode}")

        self.mode = mode
        self.config = MODE_CONFIG[mode]
        model_path = Path(self.config["model"])
        if not model_path.exists():
            raise FileNotFoundError(f"模型文件不存在：{model_path}")

        # 加载 YOLO 模型
        self.model = YOLO(str(model_path))
        self.device = device
        # 若调用方未指定，则使用配置文件中的默认值
        self.conf = float(conf if conf is not None else self.config["conf"])
        self.iou = float(iou if iou is not None else self.config["iou"])

    @property
    def window_name(self) -> str:
        """OpenCV 显示窗口的标题名称。"""
        return str(self.config["window"])

    @property
    def default_imgsz(self) -> int:
        """当前模式默认的推理图像尺寸（像素）。"""
        return int(self.config["imgsz"])

    @property
    def default_frame_interval(self) -> int:
        """当前模式默认的帧间隔（每隔 N 帧推理一次）。"""
        return int(self.config["frame_interval"])

    @property
    def box_color(self) -> tuple[int, int, int]:
        """边界框颜色（BGR 格式）。"""
        return tuple(self.config["box_color"])

    @property
    def text_color(self) -> tuple[int, int, int]:
        """标签文字颜色（BGR 格式）。"""
        return tuple(self.config["text_color"])

    def detect(self, frame_bgr: np.ndarray, imgsz: int | None = None) -> List[Detection]:
        """
        对单帧图像（BGR 格式）执行目标检测。

        Args:
            frame_bgr: OpenCV 读取的 BGR 图像帧。
            imgsz:     推理图像尺寸，None 时使用模式默认值。

        Returns:
            Detection 列表，每个元素包含标签、置信度和边界框坐标。
        """
        predict_kwargs: Dict[str, Any] = {
            "source": frame_bgr,
            "conf": self.conf,
            "iou": self.iou,
            "verbose": False,  # 关闭控制台输出
        }
        # 若该模式限定了检测类别，则传入类别过滤参数
        if self.config["classes"] is not None:
            predict_kwargs["classes"] = self.config["classes"]
        # 若指定了推理设备，则传入
        if self.device is not None:
            predict_kwargs["device"] = self.device
        # 若指定了图像尺寸，则覆盖默认值
        if imgsz is not None:
            predict_kwargs["imgsz"] = imgsz

        results = self.model.predict(**predict_kwargs)
        result = results[0]  # 单帧推理只有一个结果
        return _extract_detections(result)


class YoloDetector:
    """
    图片上传服务（Flask）使用的静态图像检测封装类。

    与 VideoDetector 的区别：
    - 接收 PIL.Image 而非 BGR ndarray；
    - 同时返回带标注的可视化图像。
    """

    def __init__(self, weights_path: str | Path, device: Optional[str] = None, conf: float = 0.25):
        _require_yolo()

        weights = Path(weights_path)
        if not weights.exists():
            raise FileNotFoundError(f"模型文件不存在：{weights}")

        self.weights_path = str(weights)
        self.model = YOLO(self.weights_path)
        self.device = device
        self.conf = float(conf)

    def predict(
        self,
        image: Image.Image,
        *,
        conf: Optional[float] = None,       # 覆盖实例默认置信度
        imgsz: Optional[int] = None,        # 推理图像尺寸
        iou: Optional[float] = None,        # NMS IoU 阈值
        augment: bool = False,              # 是否启用测试时数据增强（TTA）
        max_det: int = 100,                 # 单张图片最大检测数量
        topk_labels: int = 12,             # 可视化时最多显示的标签数（按置信度降序取 Top-K）
    ) -> Tuple[List[Detection], Image.Image]:
        """
        对 PIL 图像执行检测，返回检测结果列表和带标注的输出图像。

        Args:
            image:      输入的 PIL.Image 对象（RGB 模式）。
            conf:       置信度阈值，None 时使用实例默认值。
            imgsz:      推理图像尺寸（像素）。
            iou:        NMS IoU 阈值。
            augment:    是否启用 TTA 增强推理。
            max_det:    单图最大检测框数。
            topk_labels: 在可视化图上最多显示几个标签。

        Returns:
            (detections, output_image)：检测结果列表 + 带标注的 PIL 图像。
        """
        predict_kwargs: Dict[str, Any] = {
            "source": image,
            "device": self.device,
            "conf": self.conf if conf is None else float(conf),
            "max_det": max_det,
            "verbose": False,
        }
        if imgsz is not None:
            predict_kwargs["imgsz"] = int(imgsz)
        if iou is not None:
            predict_kwargs["iou"] = float(iou)
        if augment:
            predict_kwargs["augment"] = True

        results = self.model.predict(**predict_kwargs)
        result = results[0]
        detections = _extract_detections(result)

        # ---- 可视化：仅显示置信度最高的 topk_labels 个框 ----
        result_for_plot = result
        if result.boxes is not None and len(result.boxes) > 0 and topk_labels > 0:
            try:
                confs = result.boxes.conf.detach().cpu().numpy()
                if confs.shape[0] > topk_labels:
                    # 按置信度降序排列，保留前 topk_labels 个框
                    keep = np.argsort(confs)[::-1][:topk_labels]
                    result_for_plot = result
                    result_for_plot.boxes = result.boxes[keep]  # type: ignore[attr-defined]
            except Exception:
                result_for_plot = result  # 过滤失败时退回到原始结果

        # YOLO plot() 返回 BGR ndarray，转换为 RGB 后包装为 PIL.Image
        plotted = result_for_plot.plot(line_width=3, labels=True, conf=True, font_size=10)
        plotted_rgb = plotted[..., ::-1]        # BGR → RGB
        output_image = Image.fromarray(plotted_rgb.astype(np.uint8))
        return detections, output_image


def _extract_detections(result: Any) -> List[Detection]:
    """
    从 YOLO 推理结果中提取 Detection 列表。

    Args:
        result: ultralytics 返回的单帧推理结果对象。

    Returns:
        Detection 列表；若无检测结果则返回空列表。
    """
    detections: List[Detection] = []
    # 若本帧无任何检测框，直接返回空列表
    if result.boxes is None or len(result.boxes) == 0:
        return detections

    # 类别 ID → 类别名称的映射字典
    names = result.names if isinstance(result.names, dict) else {}
    # 将 GPU 张量转移到 CPU 并转为 numpy 数组
    xyxy = result.boxes.xyxy.detach().cpu().numpy()          # 边界框坐标
    confs = result.boxes.conf.detach().cpu().numpy()          # 各框置信度
    classes = result.boxes.cls.detach().cpu().numpy().astype(int)  # 各框类别 ID

    for idx in range(xyxy.shape[0]):
        x1, y1, x2, y2 = xyxy[idx].tolist()
        class_id = int(classes[idx])
        detections.append(
            Detection(
                class_id=class_id,
                label=names.get(class_id, str(class_id)),   # 未知类别则用 ID 字符串代替
                confidence=float(confs[idx]),
                xyxy=(int(x1), int(y1), int(x2), int(y2)),
            )
        )
    return detections


def draw_detections(
    frame_bgr: np.ndarray,
    detections: List[Detection],
    box_color: tuple[int, int, int] = (0, 255, 0),   # 默认绿色边界框
    text_color: tuple[int, int, int] = (0, 0, 0),    # 默认黑色文字
) -> np.ndarray:
    """
    在 BGR 图像帧上绘制检测框和标签。

    边框粗细和字体大小会根据图像分辨率自适应缩放。

    Args:
        frame_bgr:   原始 BGR 图像帧（不会被修改）。
        detections:  Detection 列表。
        box_color:   边界框与标签背景颜色（BGR）。
        text_color:  标签文字颜色（BGR）。

    Returns:
        绘制了检测框的新 BGR 图像帧（原帧的副本）。
    """
    output = frame_bgr.copy()   # 避免修改原始帧
    height, width = output.shape[:2]

    # 根据图像最短边自适应计算线宽和字体大小
    base_thickness = max(2, int(round(min(width, height) / 320)))
    font_scale = max(0.7, min(width, height) / 900.0)

    for detection in detections:
        x1, y1, x2, y2 = detection.xyxy
        # 组合标签字符串：类别名 + 置信度（保留两位小数）
        label = f"{detection.label} {detection.confidence:.2f}"
        box_w = max(x2 - x1, 1)
        box_h = max(y2 - y1, 1)
        # 小目标（边界框较小）时额外增加一个像素的线宽
        thickness = base_thickness + (1 if min(box_w, box_h) < 80 else 0)

        # 绘制边界框矩形
        cv2.rectangle(output, (x1, y1), (x2, y2), box_color, thickness)

        # 计算标签文字区域的尺寸
        (text_w, text_h), baseline = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            thickness,
        )
        text_x = max(x1, 0)

        # 优先将标签背景绘制在边界框上方；若上方空间不足则绘制在框内顶部
        prefer_top = y1 >= text_h + baseline + 12
        if prefer_top:
            bg_top = y1 - text_h - baseline - 12
            bg_bottom = y1
            text_y = y1 - baseline - 6
        else:
            bg_top = y1
            bg_bottom = min(y1 + text_h + baseline + 12, height - 1)
            text_y = min(bg_bottom - baseline - 6, height - 1)
        bg_right = text_x + text_w + 8

        # 绘制标签背景色块（实心矩形）
        cv2.rectangle(output, (text_x, bg_top), (min(bg_right, width - 1), bg_bottom), box_color, -1)
        # 在背景色块上绘制标签文字
        cv2.putText(
            output,
            label,
            (text_x + 4, text_y - 4),       # 留出 4px 内边距
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            text_color,
            thickness,
            cv2.LINE_AA,                     # 抗锯齿渲染
        )
    return output