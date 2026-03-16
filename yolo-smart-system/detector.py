from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

try:
    from ultralytics import YOLO
except Exception as e:  # pragma: no cover
    YOLO = None  # type: ignore
    _IMPORT_ERR = e


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    xyxy: Tuple[int, int, int, int]


class YoloDetector:
    """Light wrapper around Ultralytics YOLO prediction and plotting."""

    def __init__(self, weights_path: str | Path, device: Optional[str] = None, conf: float = 0.25):
        if YOLO is None:  # pragma: no cover
            raise RuntimeError(
                'Failed to import ultralytics. Please install dependencies first. '
                f'Original error: {_IMPORT_ERR}'
            )

        self.weights_path = str(weights_path)
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
        # Do not pass imgsz=None into ultralytics; only set it when provided.
        predict_kwargs: Dict[str, Any] = {
            'source': image,
            'device': self.device,
            'conf': self.conf if conf is None else float(conf),
            'max_det': max_det,
            'verbose': False,
        }
        if imgsz is not None:
            predict_kwargs['imgsz'] = int(imgsz)
        if iou is not None:
            predict_kwargs['iou'] = float(iou)
        if augment:
            predict_kwargs['augment'] = True

        results = self.model.predict(**predict_kwargs)
        r = results[0]

        dets: List[Detection] = []
        if r.boxes is not None and len(r.boxes) > 0:
            names: Dict[int, str] = r.names if isinstance(r.names, dict) else {}
            xyxy = r.boxes.xyxy.detach().cpu().numpy()
            conf_arr = r.boxes.conf.detach().cpu().numpy()
            cls = r.boxes.cls.detach().cpu().numpy().astype(int)
            for i in range(xyxy.shape[0]):
                x1, y1, x2, y2 = xyxy[i].tolist()
                dets.append(
                    Detection(
                        label=names.get(int(cls[i]), str(int(cls[i]))),
                        confidence=float(conf_arr[i]),
                        xyxy=(int(x1), int(y1), int(x2), int(y2)),
                    )
                )

        # Plot top-K labels only to reduce overlay clutter while preserving full detection list.
        r_plot = r
        if r.boxes is not None and len(r.boxes) > 0 and topk_labels > 0:
            try:
                confs = r.boxes.conf.detach().cpu().numpy()
                if confs.shape[0] > topk_labels:
                    keep = np.argsort(confs)[::-1][:topk_labels]
                    r_plot = r
                    r_plot.boxes = r.boxes[keep]  # type: ignore[attr-defined]
            except Exception:
                r_plot = r

        plotted = r_plot.plot(line_width=3, labels=True, conf=True, font_size=10)  # ndarray (H,W,3) BGR
        plotted_rgb = plotted[..., ::-1]
        out_img = Image.fromarray(plotted_rgb.astype(np.uint8))
        return dets, out_img
