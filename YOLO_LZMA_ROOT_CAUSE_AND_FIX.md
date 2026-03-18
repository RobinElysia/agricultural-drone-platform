# YOLO Video Detection 500 (`No module named '_lzma'`) Root Cause and Fix

## 1. Symptom
- Endpoint: `POST /api/yolo/detect-video` (Express)
- Upstream call: `POST http://127.0.0.1:5000/detect_video` (Flask)
- Response: HTTP 500
- Key error: `No module named '_lzma'`

## 2. Root Cause
This is an environment/runtime issue, not business logic.

`ultralytics` import depends on Python `lzma` support. The `_lzma` extension is part of Python stdlib bindings and is only available when Python is built with `liblzma` present. If `_lzma` is missing, `ultralytics` import fails, then YOLO video detection returns 500.

## 3. Code Changes in This Fix

### 3.1 `yolo/detector.py`
- Added `_ensure_lzma_support()` before importing `ultralytics`.
- If `lzma` import fails, raises a clear actionable runtime error.
- Enhanced `_require_yolo()` to return a focused `_lzma` message when applicable.
- Kept NumPy compatibility guard.

### 3.2 `backend/src/controllers/yolo.ts`
- Improved `detectVideo` error mapping.
- If upstream error contains `_lzma`, backend now returns an explicit environment remediation message.

### 3.3 `yolo/Dockerfile`
- Added required system packages:
  - `xz-utils`, `liblzma5`, `liblzma-dev`
  - `ffmpeg`, `libgl1`, `libglib2.0-0`
- Upgraded `pip/setuptools/wheel` before installing requirements.

## 4. Ubuntu Host Fix (non-Docker)
1. Install OS dependencies:
   - `sudo apt-get update`
   - `sudo apt-get install -y xz-utils liblzma-dev`
2. Validate Python runtime:
   - `python -c "import lzma; print('lzma ok')"`
3. If still failing, rebuild/reinstall Python so `_lzma` is compiled in.
4. Reinstall project dependencies:
   - `pip install -r yolo/requirements.txt --upgrade --force-reinstall`

## 5. Docker Fix
1. Rebuild YOLO image:
   - `docker compose build yolo --no-cache`
2. Restart services:
   - `docker compose up -d yolo backend`
3. Validate inside container:
   - `docker compose exec yolo python -c "import lzma; import ultralytics; print('ok')"`

## 6. Verification Checklist
- `import lzma` succeeds.
- `import ultralytics` succeeds.
- `POST /api/yolo/detect-video` returns 200.
- Returned `result_url` is playable via `/api/yolo/media`.

## 7. Notes
A full backend TypeScript build currently has unrelated pre-existing type errors in other modules (`Request.user`, Redis typings, etc.). Those are outside this `_lzma` incident scope.
