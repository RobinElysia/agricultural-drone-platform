# Python YOLO imgsz None Fix Notes v1.0.5

## Version Info
- Version: `v1.0.5`
- Date: `2026-03-12`
- Scope: Python YOLO inference parameter handling (`imgsz`)

## Error Observed
PEST inference failed with message:
- `imgsz=None` has invalid type `NoneType`
- valid `imgsz` must be `int` or `list`

This caused 500 responses in Python backend inference.

## Root Cause
In `yolo-smart-system/detector.py`, `YoloDetector.predict()` always passed:
- `imgsz=imgsz`

When caller did not provide `imgsz`, this became explicit `imgsz=None`,
which newer Ultralytics versions treat as invalid.

## Fix
Updated `YoloDetector.predict()` to build kwargs dynamically:
- Always pass required fields (`source`, `device`, `conf`, `max_det`, `verbose`)
- Only pass `imgsz` when it is not `None`

Code pattern:
- `if imgsz is not None: predict_kwargs['imgsz'] = int(imgsz)`
- `self.model.predict(**predict_kwargs)`

## Impact
- Requests without `imgsz` now use model defaults safely.
- Requests with valid numeric `imgsz` continue to work.
- Eliminates this specific 500 error path for `imgsz=None`.

## Validation
- Python syntax compile check passed:
  - `python -m py_compile yolo-smart-system/detector.py yolo-smart-system/app.py yolo-smart-system/face_auth.py`
- Confirmed new conditional parameter passing exists in code.

## Modified File
- `yolo-smart-system/detector.py`
