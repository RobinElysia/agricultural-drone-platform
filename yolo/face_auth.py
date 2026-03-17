from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image


@dataclass(frozen=True)
class AuthResult:
    ok: bool
    reason: str
    confidence: Optional[float] = None
    name: Optional[str] = None


class AdminFaceAuth:
    def __init__(
        self,
        admin_dir: str | Path,
        cascade_path: Optional[str | Path] = None,
        model_path: Optional[str | Path] = None,
    ):
        self.admin_dir = Path(admin_dir)
        self.admin_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = Path(model_path) if model_path else (self.admin_dir / "lbph_model.yml")

        self._init_error: Optional[str] = None
        self.label_names: List[str] = []
        self._trained = False

        if cascade_path is None:
            cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(str(cascade_path))
        if self.face_cascade.empty():
            self._init_error = f"无法加载 Haar 级联文件: {cascade_path}"

        self.recognizer = self._create_lbph_recognizer()
        if self.recognizer is None and self._init_error is None:
            self._init_error = "OpenCV LBPH 不可用，请安装 opencv-contrib-python。"

        if self.model_path.exists() and self.recognizer is not None:
            self._load_model()

    @staticmethod
    def _create_lbph_recognizer():
        if not hasattr(cv2, "face"):
            return None

        face_mod = cv2.face
        creator = getattr(face_mod, "LBPHFaceRecognizer_create", None)
        if callable(creator):
            return creator()

        lbph_cls = getattr(face_mod, "LBPHFaceRecognizer", None)
        if lbph_cls is not None:
            create_fn = getattr(lbph_cls, "create", None)
            if callable(create_fn):
                return create_fn()

        return None

    def _is_available(self) -> bool:
        return self._init_error is None and self.recognizer is not None and not self.face_cascade.empty()

    def _load_model(self) -> None:
        if self.recognizer is None:
            return
        self.recognizer.read(str(self.model_path))
        labels_file = self.admin_dir / "labels.txt"
        if labels_file.exists():
            self.label_names = [line.strip() for line in labels_file.read_text(encoding="utf-8").splitlines() if line.strip()]
        self._trained = True

    def _save_labels(self) -> None:
        (self.admin_dir / "labels.txt").write_text("\n".join(self.label_names), encoding="utf-8")

    @staticmethod
    def _to_gray_np(image: Image.Image) -> np.ndarray:
        rgb = np.array(image.convert("RGB"))
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    def _detect_largest_face(self, gray: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
        if faces is None or len(faces) == 0:
            return None
        x, y, w, h = sorted(faces, key=lambda item: item[2] * item[3], reverse=True)[0]
        return int(x), int(y), int(w), int(h)

    def train_from_folder(self) -> AuthResult:
        if not self._is_available():
            return AuthResult(False, self._init_error or "当前环境不支持人脸认证。")

        image_paths = []
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.webp"):
            image_paths.extend(self.admin_dir.glob(ext))
        image_paths = [path for path in image_paths if path.name.lower() not in {"lbph_model.yml", "labels.txt"}]

        if not image_paths:
            return AuthResult(False, f"未找到管理员人脸图片，请将图片放入 {self.admin_dir}")

        faces: List[np.ndarray] = []
        labels: List[int] = []
        self.label_names = []

        for path in sorted(image_paths):
            name = path.stem.split("_")[0].strip() or "admin"
            if name not in self.label_names:
                self.label_names.append(name)
            label_id = self.label_names.index(name)

            image = Image.open(path)
            gray = self._to_gray_np(image)
            rect = self._detect_largest_face(gray)
            if rect is None:
                continue
            x, y, w, h = rect
            roi = gray[y : y + h, x : x + w]
            roi = cv2.resize(roi, (200, 200))
            faces.append(roi)
            labels.append(label_id)

        if len(faces) < 2:
            return AuthResult(False, "可用于训练的人脸样本太少，至少需要 2 张可识别人脸。")

        self.recognizer.train(faces, np.array(labels, dtype=np.int32))
        self.recognizer.write(str(self.model_path))
        self._save_labels()
        self._trained = True
        return AuthResult(True, f"训练完成: {len(faces)} 张人脸，{len(self.label_names)} 个类别。")

    def verify(self, image: Image.Image, threshold: float = 70.0) -> AuthResult:
        if not self._is_available():
            return AuthResult(False, self._init_error or "当前环境不支持人脸认证。")
        if not self._trained:
            return AuthResult(False, "管理员人脸模型尚未训练，请先训练。")

        gray = self._to_gray_np(image)
        rect = self._detect_largest_face(gray)
        if rect is None:
            return AuthResult(False, "未检测到清晰正脸，请上传正面人脸图片。")

        x, y, w, h = rect
        roi = gray[y : y + h, x : x + w]
        roi = cv2.resize(roi, (200, 200))
        label_id, confidence = self.recognizer.predict(roi)

        if confidence <= float(threshold):
            name = self.label_names[label_id] if 0 <= label_id < len(self.label_names) else "admin"
            return AuthResult(True, f"管理员认证通过: {name}", confidence=float(confidence), name=name)
        return AuthResult(False, "管理员认证失败: 未匹配到身份", confidence=float(confidence))
