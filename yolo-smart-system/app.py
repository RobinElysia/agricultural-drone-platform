from __future__ import annotations

import base64
import binascii
import os
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Optional

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, session, url_for
from PIL import Image

from detector import YoloDetector
from face_auth import AdminFaceAuth, AuthResult


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / 'models'
ADMIN_DIR = BASE_DIR / 'admin_faces'
STATIC_DIR = BASE_DIR / 'static'
UPLOAD_DIR = STATIC_DIR / 'uploads'
RESULT_DIR = STATIC_DIR / 'results'

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
ADMIN_DIR.mkdir(parents=True, exist_ok=True)


def _allowed_ext(filename: str) -> bool:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in {'jpg', 'jpeg', 'png', 'bmp', 'webp'}


def _save_upload(file_storage) -> Optional[Path]:
    if file_storage is None or file_storage.filename is None:
        return None
    filename = file_storage.filename
    if not filename or not _allowed_ext(filename):
        return None
    suffix = '.' + filename.rsplit('.', 1)[-1].lower()
    out = UPLOAD_DIR / f'{uuid.uuid4().hex}{suffix}'
    file_storage.save(out)
    return out


def _save_base64_upload(image_base64: str, filename: str = 'upload.jpg') -> Optional[Path]:
    if not image_base64:
        return None

    payload = image_base64.split(',', 1)[-1].strip()
    if not payload:
        return None

    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    if ext not in {'jpg', 'jpeg', 'png', 'bmp', 'webp'}:
        ext = 'jpg'

    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except (ValueError, binascii.Error):
        return None

    out = UPLOAD_DIR / f'{uuid.uuid4().hex}.{ext}'
    out.write_bytes(image_bytes)
    return out


def _open_image(path: Path) -> Image.Image:
    img = Image.open(path)
    return img.convert('RGB')

def _parse_optional_int(value: Any) -> Optional[int]:
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

def _parse_optional_float(value: Any) -> Optional[float]:
    if value in (None, ''):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def _parse_optional_bool(value: Any) -> Optional[bool]:
    if value in (None, ''):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {'1', 'true', 'yes', 'on'}:
            return True
        if normalized in {'0', 'false', 'no', 'off'}:
            return False
    return None


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'yolo-smart-system-secret')

    # Model weights paths (put .pt files under models/ or configure env vars)
    pest_weights = os.environ.get('PEST_MODEL', str(MODELS_DIR / 'pest.pt'))
    fire_weights = os.environ.get('FIRE_MODEL', str(MODELS_DIR / 'fire.pt'))

    # Default inference confidence
    pest_conf = float(os.environ.get('PEST_CONF', '0.60'))
    fire_conf = float(os.environ.get('FIRE_CONF', '0.40'))
    pest_imgsz = int(os.environ.get('PEST_IMGSZ', '1280'))
    fire_imgsz = int(os.environ.get('FIRE_IMGSZ', '1280'))
    pest_iou = float(os.environ.get('PEST_IOU', '0.45'))
    fire_iou = float(os.environ.get('FIRE_IOU', '0.45'))
    pest_augment = os.environ.get('PEST_AUGMENT', '1').strip().lower() in {'1', 'true', 'yes', 'on'}
    fire_augment = os.environ.get('FIRE_AUGMENT', '1').strip().lower() in {'1', 'true', 'yes', 'on'}

    # Device option: 'cpu', '0', '0,1', etc.
    device = os.environ.get('YOLO_DEVICE') or None

    detector_cfg = {
        'pest': {'weights': pest_weights, 'conf': pest_conf, 'imgsz': pest_imgsz, 'iou': pest_iou, 'augment': pest_augment},
        'fire': {'weights': fire_weights, 'conf': fire_conf, 'imgsz': fire_imgsz, 'iou': fire_iou, 'augment': fire_augment},
    }
    detector_cache: Dict[str, YoloDetector] = {}

    def _get_detector(task: str) -> YoloDetector:
        if task in detector_cache:
            return detector_cache[task]
        cfg = detector_cfg[task]
        weights = Path(cfg['weights'])
        if not weights.exists():
            raise FileNotFoundError(f'Model weight not found: {weights} (place .pt in models/ or set env vars)')
        d = YoloDetector(str(weights), device=device, conf=float(cfg['conf']))
        detector_cache[task] = d
        return d

    try:
        auth = AdminFaceAuth(ADMIN_DIR)
    except Exception as e:
        # Keep YOLO service available even if admin face auth init fails.
        class _DisabledAuth:
            @staticmethod
            def train_from_folder():
                return AuthResult(ok=False, reason=f'Admin face auth unavailable: {e}')

            @staticmethod
            def verify(_img, threshold: float = 70.0):
                return AuthResult(ok=False, reason=f'Admin face auth unavailable: {e}', confidence=threshold)

        auth = _DisabledAuth()

    def _get_stats() -> Dict[str, Any]:
        stats = session.get('stats')
        if not isinstance(stats, dict):
            stats = {}
        stats.setdefault('devices', 32)
        stats.setdefault('alerts', 0)
        stats.setdefault('pest_runs', 0)
        stats.setdefault('fire_runs', 0)
        stats.setdefault('admin_logins', 0)
        stats.setdefault('system', 'RUNNING')
        session['stats'] = stats
        return stats

    @app.get('/')
    def index():
        pest_saved = session.get('pest')
        fire_saved = session.get('fire')
        stats = _get_stats()
        return render_template(
            'index.html',
            pest=pest_saved,
            fire=fire_saved,
            auth=None,
            active_tab='pest',
            stats=stats,
            model_paths={
                'pest': pest_weights,
                'fire': fire_weights,
            },
        )

    @app.post('/detect/<task>')
    def detect(task: str):
        if task not in detector_cfg:
            return redirect(url_for('index'))
        img_path = _save_upload(request.files.get('image'))
        if img_path is None:
            return render_template(
                'index.html',
                pest=None,
                fire=None,
                auth=None,
                error='Image is empty or unsupported format (jpg/png/webp/bmp only).',
                model_paths={'pest': pest_weights, 'fire': fire_weights},
            )

        img = _open_image(img_path)
        # Frontend override: lower conf increases recall, larger imgsz helps small objects but costs latency
        conf_override = _parse_optional_float(request.form.get('conf'))
        imgsz_override = _parse_optional_int(request.form.get('imgsz'))
        iou_override = _parse_optional_float(request.form.get('iou'))
        augment_override = _parse_optional_bool(request.form.get('augment'))
        conf_val = conf_override if conf_override is not None else float(detector_cfg[task]['conf'])
        imgsz_val = imgsz_override if imgsz_override is not None else int(detector_cfg[task]['imgsz'])
        iou_val = iou_override if iou_override is not None else float(detector_cfg[task]['iou'])
        augment_val = augment_override if augment_override is not None else bool(detector_cfg[task]['augment'])
        try:
            det = _get_detector(task)
            # Avoid screen clutter in dense scenes: only show Top-K labels (all boxes still counted in list)
            topk = 12 if task == 'pest' else 10
            dets, plotted = det.predict(
                img,
                conf=conf_val,
                imgsz=imgsz_val,
                iou=iou_val,
                augment=augment_val,
                max_det=80,
                topk_labels=topk,
            )
        except Exception as e:
            return render_template(
                'index.html',
                pest=None,
                fire=None,
                auth=None,
                error=f'{task} inference failed: {e}',
                model_paths={'pest': pest_weights, 'fire': fire_weights},
            )
        out_name = f'{task}_{uuid.uuid4().hex}.jpg'
        out_path = RESULT_DIR / out_name
        plotted.save(out_path, quality=95)

        payload = {
            'upload': f'uploads/{img_path.name}',
            'result': f'results/{out_name}',
            'detections': [asdict(d) for d in dets],
            'count': len(dets),
            'conf': conf_val,
            'imgsz': imgsz_val,
            'iou': iou_val,
            'augment': augment_val,
        }
        # Keep latest result per task so switching tabs does not lose previous output
        session[task] = payload
        stats = _get_stats()
        if task == 'pest':
            stats['pest_runs'] = int(stats.get('pest_runs', 0)) + 1
        if task == 'fire':
            stats['fire_runs'] = int(stats.get('fire_runs', 0)) + 1
        # Alert metric: combine pest and fire detection counts
        pest_cnt = int((session.get('pest') or {}).get('count') or 0)
        fire_cnt = int((session.get('fire') or {}).get('count') or 0)
        stats['alerts'] = pest_cnt + fire_cnt
        session['stats'] = stats
        pest_saved = session.get('pest')
        fire_saved = session.get('fire')

        return render_template(
            'index.html',
            pest=pest_saved,
            fire=fire_saved,
            auth=None,
            active_tab=task,
            stats=stats,
            model_paths={'pest': pest_weights, 'fire': fire_weights},
        )

    @app.post('/api/detect/<task>')
    def detect_api(task: str):
        if task not in detector_cfg:
            return jsonify({'ok': False, 'error': 'unsupported task'}), 400

        payload = request.get_json(silent=True) or {}
        image_base64 = payload.get('image_base64')
        filename = payload.get('filename') or 'upload.jpg'
        img_path = _save_base64_upload(str(image_base64), str(filename))
        if img_path is None:
            return jsonify({'ok': False, 'error': 'invalid image payload'}), 400

        try:
            img = _open_image(img_path)
            conf_override = _parse_optional_float(payload.get('conf'))
            imgsz_override = _parse_optional_int(payload.get('imgsz'))
            iou_override = _parse_optional_float(payload.get('iou'))
            augment_override = _parse_optional_bool(payload.get('augment'))
            conf_val = conf_override if conf_override is not None else float(detector_cfg[task]['conf'])
            imgsz_val = imgsz_override if imgsz_override is not None else int(detector_cfg[task]['imgsz'])
            iou_val = iou_override if iou_override is not None else float(detector_cfg[task]['iou'])
            augment_val = augment_override if augment_override is not None else bool(detector_cfg[task]['augment'])
            det = _get_detector(task)
            topk = 12 if task == 'pest' else 10
            dets, plotted = det.predict(
                img,
                conf=conf_val,
                imgsz=imgsz_val,
                iou=iou_val,
                augment=augment_val,
                max_det=80,
                topk_labels=topk,
            )
        except Exception as e:
            return jsonify({'ok': False, 'error': f'{task} inference failed: {e}'}), 500

        out_name = f'{task}_{uuid.uuid4().hex}.jpg'
        out_path = RESULT_DIR / out_name
        plotted.save(out_path, quality=95)

        return jsonify(
            {
                'ok': True,
                'task': task,
                'upload': f'uploads/{img_path.name}',
                'result': f'results/{out_name}',
                'result_url': url_for('static_files', filename=f'results/{out_name}', _external=False),
                'detections': [asdict(d) for d in dets],
                'count': len(dets),
                'conf': conf_val,
                'imgsz': imgsz_val,
                'iou': iou_val,
                'augment': augment_val,
            }
        )

    @app.post('/admin/train')
    def admin_train():
        r = auth.train_from_folder()
        stats = _get_stats()
        return render_template(
            'index.html',
            pest=None,
            fire=None,
            auth={
                'ok': r.ok,
                'reason': r.reason,
                'confidence': r.confidence,
                'name': r.name,
            },
            active_tab='admin',
            stats=stats,
            model_paths={'pest': pest_weights, 'fire': fire_weights},
        )

    @app.post('/admin/login')
    def admin_login():
        img_path = _save_upload(request.files.get('face'))
        if img_path is None:
            stats = _get_stats()
            return render_template(
                'index.html',
                pest=None,
                fire=None,
                auth={'ok': False, 'reason': 'Image is empty or unsupported format (jpg/png/webp/bmp only).'},
                active_tab='admin',
                stats=stats,
                model_paths={'pest': pest_weights, 'fire': fire_weights},
            )
        img = _open_image(img_path)
        threshold = float(request.form.get('threshold') or '70')
        r = auth.verify(img, threshold=threshold)
        stats = _get_stats()
        if r.ok:
            stats['admin_logins'] = int(stats.get('admin_logins', 0)) + 1
        session['stats'] = stats
        return render_template(
            'index.html',
            pest=None,
            fire=None,
            auth={
                'ok': r.ok,
                'reason': r.reason,
                'confidence': r.confidence,
                'upload': f'uploads/{img_path.name}',
                'name': r.name,
            },
            active_tab='admin',
            stats=stats,
            model_paths={'pest': pest_weights, 'fire': fire_weights},
        )

    @app.get('/static/<path:filename>')
    def static_files(filename: str):
        return send_from_directory(STATIC_DIR, filename)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5000')), debug=True)
