from __future__ import annotations

import base64
import binascii
import os
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Optional

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory, session
from PIL import Image

from detector import YoloDetector
from face_auth import AdminFaceAuth, AuthResult


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
ADMIN_DIR = BASE_DIR / "admin_faces"
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
RESULT_DIR = STATIC_DIR / "results"

for required_dir in (MODELS_DIR, ADMIN_DIR, UPLOAD_DIR, RESULT_DIR):
    required_dir.mkdir(parents=True, exist_ok=True)


def _allowed_ext(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in {"jpg", "jpeg", "png", "bmp", "webp"}


def _allowed_video_ext(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in {"mp4", "avi", "mov", "mkv", "webm"}


def _save_upload(file_storage) -> Optional[Path]:
    if file_storage is None or file_storage.filename is None:
        return None
    filename = file_storage.filename
    if not filename or not _allowed_ext(filename):
        return None
    suffix = "." + filename.rsplit(".", 1)[-1].lower()
    output = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    file_storage.save(output)
    return output


def _save_video_upload(file_storage) -> Optional[Path]:
    if file_storage is None or file_storage.filename is None:
        return None
    filename = file_storage.filename
    if not filename or not _allowed_video_ext(filename):
        return None
    suffix = "." + filename.rsplit(".", 1)[-1].lower()
    output = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    file_storage.save(output)
    return output


def _save_base64_upload(image_base64: str, filename: str = "upload.jpg") -> Optional[Path]:
    if not image_base64:
        return None

    payload = image_base64.split(",", 1)[-1].strip()
    if not payload:
        return None

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "bmp", "webp"}:
        ext = "jpg"

    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except (ValueError, binascii.Error):
        return None

    output = UPLOAD_DIR / f"{uuid.uuid4().hex}.{ext}"
    output.write_bytes(image_bytes)
    return output


def _open_image(path: Path) -> Image.Image:
    image = Image.open(path)
    return image.convert("RGB")


def _parse_optional_int(value: Any) -> Optional[int]:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_optional_float(value: Any) -> Optional[float]:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_optional_bool(value: Any) -> Optional[bool]:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    return None


def _build_video_payload(
    *,
    task: str,
    upload_path: Path,
    result_name: str,
    total_frames: int,
    frames_with_detections: int,
    total_detections: int,
    conf: float,
    imgsz: int,
    iou: float,
    augment: bool,
) -> Dict[str, Any]:
    return {
        "task": task,
        "upload": f"uploads/{upload_path.name}",
        "result": f"results/{result_name}",
        "result_url": f"/static/results/{result_name}",
        "total_frames": total_frames,
        "frames_with_detections": frames_with_detections,
        "total_detections": total_detections,
        "conf": conf,
        "imgsz": imgsz,
        "iou": iou,
        "augment": augment,
    }


def _process_video_detection(
    *,
    video_path: Path,
    task: str,
    detector: YoloDetector,
    conf: float,
    imgsz: int,
    iou: float,
    augment: bool,
) -> Dict[str, Any]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError("无法打开上传的视频文件。")

    fps = capture.get(cv2.CAP_PROP_FPS)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    if width <= 0 or height <= 0:
        capture.release()
        raise RuntimeError("无法读取视频分辨率。")

    output_name = f"{task}_video_{uuid.uuid4().hex}.mp4"
    output_path = RESULT_DIR / output_name
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps if fps and fps > 0 else 25.0, (width, height))
    if not writer.isOpened():
        capture.release()
        raise RuntimeError("无法创建检测后视频文件。")

    total_frames = 0
    frames_with_detections = 0
    total_detections = 0

    try:
        while True:
            ok, frame_bgr = capture.read()
            if not ok:
                break

            total_frames += 1
            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            frame_image = Image.fromarray(frame_rgb)
            detections, plotted = detector.predict(
                frame_image,
                conf=conf,
                imgsz=imgsz,
                iou=iou,
                augment=augment,
                max_det=80,
                topk_labels=12 if task == "pest" else 10,
            )
            if detections:
                frames_with_detections += 1
                total_detections += len(detections)

            plotted_bgr = cv2.cvtColor(np.array(plotted), cv2.COLOR_RGB2BGR)
            if plotted_bgr.shape[1] != width or plotted_bgr.shape[0] != height:
                plotted_bgr = cv2.resize(plotted_bgr, (width, height))
            writer.write(plotted_bgr)
    finally:
        capture.release()
        writer.release()

    return _build_video_payload(
        task=task,
        upload_path=video_path,
        result_name=output_name,
        total_frames=total_frames,
        frames_with_detections=frames_with_detections,
        total_detections=total_detections,
        conf=conf,
        imgsz=imgsz,
        iou=iou,
        augment=augment,
    )


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.environ.get("FLASK_SECRET_KEY", "yolo-smart-system-secret")

    pest_weights = os.environ.get("PEST_MODEL", str(MODELS_DIR / "pest.pt"))
    fire_weights = os.environ.get("FIRE_MODEL", str(MODELS_DIR / "fire.pt"))

    pest_conf = float(os.environ.get("PEST_CONF", "0.60"))
    fire_conf = float(os.environ.get("FIRE_CONF", "0.40"))
    pest_imgsz = int(os.environ.get("PEST_IMGSZ", "1280"))
    fire_imgsz = int(os.environ.get("FIRE_IMGSZ", "1280"))
    pest_iou = float(os.environ.get("PEST_IOU", "0.45"))
    fire_iou = float(os.environ.get("FIRE_IOU", "0.45"))
    pest_augment = os.environ.get("PEST_AUGMENT", "1").strip().lower() in {"1", "true", "yes", "on"}
    fire_augment = os.environ.get("FIRE_AUGMENT", "1").strip().lower() in {"1", "true", "yes", "on"}
    device = os.environ.get("YOLO_DEVICE") or None

    detector_cfg = {
        "pest": {
            "weights": pest_weights,
            "conf": pest_conf,
            "imgsz": pest_imgsz,
            "iou": pest_iou,
            "augment": pest_augment,
        },
        "fire": {
            "weights": fire_weights,
            "conf": fire_conf,
            "imgsz": fire_imgsz,
            "iou": fire_iou,
            "augment": fire_augment,
        },
    }
    detector_cache: Dict[str, YoloDetector] = {}

    def _get_detector(task: str) -> YoloDetector:
        if task in detector_cache:
            return detector_cache[task]
        cfg = detector_cfg[task]
        detector = YoloDetector(cfg["weights"], device=device, conf=float(cfg["conf"]))
        detector_cache[task] = detector
        return detector

    try:
        auth = AdminFaceAuth(ADMIN_DIR)
    except Exception as exc:
        class _DisabledAuth:
            @staticmethod
            def train_from_folder():
                return AuthResult(ok=False, reason=f"管理员人脸认证不可用: {exc}")

            @staticmethod
            def verify(_img, threshold: float = 70.0):
                return AuthResult(ok=False, reason=f"管理员人脸认证不可用: {exc}", confidence=threshold)

        auth = _DisabledAuth()

    def _get_stats() -> Dict[str, Any]:
        stats = session.get("stats")
        if not isinstance(stats, dict):
            stats = {}
        stats.setdefault("devices", 32)
        stats.setdefault("alerts", 0)
        stats.setdefault("pest_runs", 0)
        stats.setdefault("fire_runs", 0)
        stats.setdefault("admin_logins", 0)
        stats.setdefault("system", "RUNNING")
        session["stats"] = stats
        return stats

    def _render_home(**kwargs):
        return render_template(
            "index.html",
            pest=session.get("pest"),
            fire=session.get("fire"),
            auth=kwargs.get("auth"),
            error=kwargs.get("error"),
            active_tab=kwargs.get("active_tab", "pest"),
            stats=_get_stats(),
            model_paths={"pest": pest_weights, "fire": fire_weights},
        )

    @app.get("/")
    def index():
        return _render_home()

    @app.post("/detect/<task>")
    def detect(task: str):
        if task not in detector_cfg:
            return _render_home(error="不支持的任务类型。")

        image_path = _save_upload(request.files.get("image"))
        if image_path is None:
            return _render_home(active_tab=task, error="图片为空或格式不支持，仅支持 jpg/png/webp/bmp。")

        image = _open_image(image_path)
        conf_val = _parse_optional_float(request.form.get("conf")) or float(detector_cfg[task]["conf"])
        imgsz_val = _parse_optional_int(request.form.get("imgsz")) or int(detector_cfg[task]["imgsz"])
        iou_val = _parse_optional_float(request.form.get("iou")) or float(detector_cfg[task]["iou"])
        augment_override = _parse_optional_bool(request.form.get("augment"))
        augment_val = augment_override if augment_override is not None else bool(detector_cfg[task]["augment"])

        try:
            topk = 12 if task == "pest" else 10
            detections, plotted = _get_detector(task).predict(
                image,
                conf=conf_val,
                imgsz=imgsz_val,
                iou=iou_val,
                augment=augment_val,
                max_det=80,
                topk_labels=topk,
            )
        except Exception as exc:
            return _render_home(active_tab=task, error=f"{task} 推理失败: {exc}")

        output_name = f"{task}_{uuid.uuid4().hex}.jpg"
        plotted.save(RESULT_DIR / output_name, quality=95)
        session[task] = {
            "upload": f"uploads/{image_path.name}",
            "result": f"results/{output_name}",
            "detections": [asdict(item) for item in detections],
            "count": len(detections),
            "conf": conf_val,
            "imgsz": imgsz_val,
            "iou": iou_val,
            "augment": augment_val,
        }

        stats = _get_stats()
        if task == "pest":
            stats["pest_runs"] = int(stats.get("pest_runs", 0)) + 1
        if task == "fire":
            stats["fire_runs"] = int(stats.get("fire_runs", 0)) + 1
        stats["alerts"] = int((session.get("pest") or {}).get("count") or 0) + int((session.get("fire") or {}).get("count") or 0)
        session["stats"] = stats
        return _render_home(active_tab=task)

    @app.post("/detect_video")
    def detect_video():
        task = str(request.form.get("task") or "").strip().lower()
        if task not in detector_cfg:
            return jsonify({"success": False, "message": "视频检测任务不支持，仅支持 pest 或 fire。"}), 400

        video_path = _save_video_upload(request.files.get("video"))
        if video_path is None:
            return jsonify({"success": False, "message": "视频为空或格式不支持，仅支持 mp4/avi/mov/mkv/webm。"}), 400

        conf_val = _parse_optional_float(request.form.get("conf")) or float(detector_cfg[task]["conf"])
        imgsz_val = _parse_optional_int(request.form.get("imgsz")) or int(detector_cfg[task]["imgsz"])
        iou_val = _parse_optional_float(request.form.get("iou")) or float(detector_cfg[task]["iou"])
        augment_override = _parse_optional_bool(request.form.get("augment"))
        augment_val = augment_override if augment_override is not None else bool(detector_cfg[task]["augment"])

        try:
            payload = _process_video_detection(
                video_path=video_path,
                task=task,
                detector=_get_detector(task),
                conf=conf_val,
                imgsz=imgsz_val,
                iou=iou_val,
                augment=augment_val,
            )
        except Exception as exc:
            return jsonify({"success": False, "message": f"视频检测失败: {exc}"}), 500

        return jsonify(
            {
                "success": True,
                "message": "视频检测完成。",
                "task": payload["task"],
                "result_url": payload["result_url"],
                "upload_url": f"/static/{payload['upload']}",
                "total_frames": payload["total_frames"],
                "frames_with_detections": payload["frames_with_detections"],
                "total_detections": payload["total_detections"],
            }
        )

    @app.post("/api/detect/<task>")
    def detect_api(task: str):
        if task not in detector_cfg:
            return jsonify({"ok": False, "error": "unsupported task"}), 400

        payload = request.get_json(silent=True) or {}
        image_path = _save_base64_upload(str(payload.get("image_base64") or ""), str(payload.get("filename") or "upload.jpg"))
        if image_path is None:
            return jsonify({"ok": False, "error": "invalid image payload"}), 400

        try:
            conf_val = _parse_optional_float(payload.get("conf")) or float(detector_cfg[task]["conf"])
            imgsz_val = _parse_optional_int(payload.get("imgsz")) or int(detector_cfg[task]["imgsz"])
            iou_val = _parse_optional_float(payload.get("iou")) or float(detector_cfg[task]["iou"])
            augment_override = _parse_optional_bool(payload.get("augment"))
            augment_val = augment_override if augment_override is not None else bool(detector_cfg[task]["augment"])
            topk = 12 if task == "pest" else 10
            detections, plotted = _get_detector(task).predict(
                _open_image(image_path),
                conf=conf_val,
                imgsz=imgsz_val,
                iou=iou_val,
                augment=augment_val,
                max_det=80,
                topk_labels=topk,
            )
        except Exception as exc:
            return jsonify({"ok": False, "error": f"{task} inference failed: {exc}"}), 500

        output_name = f"{task}_{uuid.uuid4().hex}.jpg"
        plotted.save(RESULT_DIR / output_name, quality=95)
        return jsonify(
            {
                "ok": True,
                "task": task,
                "upload": f"uploads/{image_path.name}",
                "result": f"results/{output_name}",
                "result_url": f"/static/results/{output_name}",
                "detections": [asdict(item) for item in detections],
                "count": len(detections),
                "conf": conf_val,
                "imgsz": imgsz_val,
                "iou": iou_val,
                "augment": augment_val,
            }
        )

    @app.post("/api/detect_video/<task>")
    def detect_video_api(task: str):
        task = task.strip().lower()
        if task not in detector_cfg:
            return jsonify({"ok": False, "error": "unsupported task"}), 400

        video_path = _save_video_upload(request.files.get("video"))
        if video_path is None:
            return jsonify({"ok": False, "error": "invalid video payload"}), 400

        conf_val = _parse_optional_float(request.form.get("conf")) or float(detector_cfg[task]["conf"])
        imgsz_val = _parse_optional_int(request.form.get("imgsz")) or int(detector_cfg[task]["imgsz"])
        iou_val = _parse_optional_float(request.form.get("iou")) or float(detector_cfg[task]["iou"])
        augment_override = _parse_optional_bool(request.form.get("augment"))
        augment_val = augment_override if augment_override is not None else bool(detector_cfg[task]["augment"])

        try:
            payload = _process_video_detection(
                video_path=video_path,
                task=task,
                detector=_get_detector(task),
                conf=conf_val,
                imgsz=imgsz_val,
                iou=iou_val,
                augment=augment_val,
            )
        except Exception as exc:
            return jsonify({"ok": False, "error": f"{task} video inference failed: {exc}"}), 500

        return jsonify({"ok": True, **payload})

    @app.post("/admin/train")
    def admin_train():
        result = auth.train_from_folder()
        return _render_home(
            active_tab="admin",
            auth={
                "ok": result.ok,
                "reason": result.reason,
                "confidence": result.confidence,
                "name": result.name,
            },
        )

    @app.post("/admin/login")
    def admin_login():
        image_path = _save_upload(request.files.get("face"))
        if image_path is None:
            return _render_home(
                active_tab="admin",
                auth={"ok": False, "reason": "图片为空或格式不支持，仅支持 jpg/png/webp/bmp。"},
            )

        threshold = float(request.form.get("threshold") or "70")
        result = auth.verify(_open_image(image_path), threshold=threshold)
        stats = _get_stats()
        if result.ok:
            stats["admin_logins"] = int(stats.get("admin_logins", 0)) + 1
        session["stats"] = stats
        return _render_home(
            active_tab="admin",
            auth={
                "ok": result.ok,
                "reason": result.reason,
                "confidence": result.confidence,
                "name": result.name,
                "upload": f"uploads/{image_path.name}",
            },
        )

    @app.get("/static/<path:filename>")
    def static_files(filename: str):
        return send_from_directory(STATIC_DIR, filename)

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)
