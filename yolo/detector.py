from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

try:
    from ultralytics import YOLO
except Exception as e:  # pragma: no cover
    YOLO = None  # type: ignore
    IMPORT_ERROR = e


BASE_DIR = Path(__file__).resolve().parent
PERSON_CLASS_ID = 0


def _ensure_numpy_compat_for_yolo() -> None:
    """Torch/Ultralytics wheels in this project currently require NumPy 1.x."""
    if os.environ.get("YOLO_ALLOW_NUMPY2", "").strip().lower() in {"1", "true", "yes", "on"}:
        return
    major = int(str(np.__version__).split(".", 1)[0])
    if major >= 2:
        raise RuntimeError(
            "当前检测到 NumPy 2.x，与现有 torch/ultralytics 运行环境不兼容。"
            "请执行: pip install \"numpy<2\" --upgrade --force-reinstall"
        )


_ensure_numpy_compat_for_yolo()


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    xyxy: Tuple[int, int, int, int]
    class_id: Optional[int] = None


MODE_CONFIG = {
    "person": {
        "model": BASE_DIR / "yolov8n.pt",
        "classes": [PERSON_CLASS_ID],
        "conf": 0.25,
        "iou": 0.45,
        "imgsz": 640,
        "frame_interval": 3,
        "window": "Detection - person",
        "box_color": (0, 255, 0),
        "text_color": (0, 0, 0),
    },
    "pest": {
        "model": BASE_DIR / "models" / "pest.pt",
        "classes": None,
        "conf": 0.18,
        "iou": 0.45,
        "imgsz": 960,
        "frame_interval": 1,
        "window": "Detection - pest",
        "box_color": (0, 215, 255),
        "text_color": (20, 20, 20),
    },
    "fire": {
        "model": BASE_DIR / "models" / "fire.pt",
        "classes": None,
        "conf": 0.08,
        "iou": 0.50,
        "imgsz": 960,
        "frame_interval": 1,
        "window": "Detection - fire",
        "box_color": (0, 0, 255),
        "text_color": (255, 255, 255),
    },
}


def _require_yolo() -> None:
    if YOLO is None:  # pragma: no cover
        raise RuntimeError(
            "未安装或无法导入 ultralytics，请先安装依赖。原始错误："
            f"{IMPORT_ERROR}"
        )


class VideoDetector:
    def __init__(
        self,
        mode: str,
        device: str | None = None,
        conf: float | None = None,
        iou: float | None = None,
    ):
        _require_yolo()
        if mode not in MODE_CONFIG:
            raise ValueError(f"不支持的检测模式: {mode}")

        self.mode = mode
        self.config = MODE_CONFIG[mode]
        model_path = Path(self.config["model"])
        if not model_path.exists():
            raise FileNotFoundError(f"未找到模型文件: {model_path}")

        self.model = YOLO(str(model_path))
        self.device = device
        self.conf = float(conf if conf is not None else self.config["conf"])
        self.iou = float(iou if iou is not None else self.config["iou"])

    @property
    def window_name(self) -> str:
        return str(self.config["window"])

    @property
    def default_imgsz(self) -> int:
        return int(self.config["imgsz"])

    @property
    def default_frame_interval(self) -> int:
        return int(self.config["frame_interval"])

    @property
    def box_color(self) -> tuple[int, int, int]:
        return tuple(self.config["box_color"])

    @property
    def text_color(self) -> tuple[int, int, int]:
        return tuple(self.config["text_color"])

    def detect(self, frame_bgr: np.ndarray, imgsz: int | None = None) -> List[Detection]:
        predict_kwargs: Dict[str, Any] = {
            "source": frame_bgr,
            "conf": self.conf,
            "iou": self.iou,
            "verbose": False,
        }
        if self.config["classes"] is not None:
            predict_kwargs["classes"] = self.config["classes"]
        if self.device is not None:
            predict_kwargs["device"] = self.device
        if imgsz is not None:
            predict_kwargs["imgsz"] = imgsz

        results = self.model.predict(**predict_kwargs)
        result = results[0]
        return _extract_detections(result)


class YoloDetector:
    """Image detection wrapper used by the Flask upload service."""

    def __init__(self, weights_path: str | Path, device: Optional[str] = None, conf: float = 0.25):
        _require_yolo()

        weights = Path(weights_path)
        if not weights.exists():
            raise FileNotFoundError(f"未找到模型文件: {weights}")

        self.weights_path = str(weights)
        self.model = YOLO(self.weights_path)
        self.device = device
        self.conf = float(conf)

    def predict(
        self,
        image: Image.Image,
        *,
        conf: Optional[float] = None,
        imgsz: Optional[int] = None,
        iou: Optional[float] = None,
        augment: bool = False,
        max_det: int = 100,
        topk_labels: int = 12,
    ) -> Tuple[List[Detection], Image.Image]:
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

        result_for_plot = result
        if result.boxes is not None and len(result.boxes) > 0 and topk_labels > 0:
            try:
                confs = result.boxes.conf.detach().cpu().numpy()
                if confs.shape[0] > topk_labels:
                    keep = np.argsort(confs)[::-1][:topk_labels]
                    result_for_plot = result
                    result_for_plot.boxes = result.boxes[keep]  # type: ignore[attr-defined]
            except Exception:
                result_for_plot = result

        plotted = result_for_plot.plot(line_width=3, labels=True, conf=True, font_size=10)
        plotted_rgb = plotted[..., ::-1]
        output_image = Image.fromarray(plotted_rgb.astype(np.uint8))
        return detections, output_image


def _extract_detections(result: Any) -> List[Detection]:
    detections: List[Detection] = []
    if result.boxes is None or len(result.boxes) == 0:
        return detections

    names = result.names if isinstance(result.names, dict) else {}
    xyxy = result.boxes.xyxy.detach().cpu().numpy()
    confs = result.boxes.conf.detach().cpu().numpy()
    classes = result.boxes.cls.detach().cpu().numpy().astype(int)

    for idx in range(xyxy.shape[0]):
        x1, y1, x2, y2 = xyxy[idx].tolist()
        class_id = int(classes[idx])
        detections.append(
            Detection(
                class_id=class_id,
                label=names.get(class_id, str(class_id)),
                confidence=float(confs[idx]),
                xyxy=(int(x1), int(y1), int(x2), int(y2)),
            )
        )
    return detections


def draw_detections(
    frame_bgr: np.ndarray,
    detections: List[Detection],
    box_color: tuple[int, int, int] = (0, 255, 0),
    text_color: tuple[int, int, int] = (0, 0, 0),
) -> np.ndarray:
    output = frame_bgr.copy()
    height, width = output.shape[:2]
    base_thickness = max(2, int(round(min(width, height) / 320)))
    font_scale = max(0.7, min(width, height) / 900.0)

    for detection in detections:
        x1, y1, x2, y2 = detection.xyxy
        label = f"{detection.label} {detection.confidence:.2f}"
        box_w = max(x2 - x1, 1)
        box_h = max(y2 - y1, 1)
        thickness = base_thickness + (1 if min(box_w, box_h) < 80 else 0)
        cv2.rectangle(output, (x1, y1), (x2, y2), box_color, thickness)

        (text_w, text_h), baseline = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            thickness,
        )
        text_x = max(x1, 0)
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

        cv2.rectangle(output, (text_x, bg_top), (min(bg_right, width - 1), bg_bottom), box_color, -1)
        cv2.putText(
            output,
            label,
            (text_x + 4, text_y - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            text_color,
            thickness,
            cv2.LINE_AA,
        )
    return output
