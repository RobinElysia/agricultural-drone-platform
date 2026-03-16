from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from detector import YoloDetector


def main() -> int:
    p = argparse.ArgumentParser(description="本地快速验证：你的 pt 权重能不能对某张图出框")
    p.add_argument("--model", required=True, help="权重路径，例如 models/pest.pt")
    p.add_argument("--image", required=True, help="图片路径，例如 test.jpg")
    p.add_argument("--conf", type=float, default=0.05, help="置信度阈值，越小越容易出框")
    p.add_argument("--imgsz", type=int, default=960, help="推理尺寸，越大越利于小目标")
    p.add_argument("--out", default="debug_result.jpg", help="输出结果图")
    args = p.parse_args()

    model_path = Path(args.model)
    img_path = Path(args.image)
    if not model_path.exists():
        raise FileNotFoundError(f"找不到模型：{model_path}")
    if not img_path.exists():
        raise FileNotFoundError(f"找不到图片：{img_path}")

    det = YoloDetector(str(model_path), conf=args.conf)
    img = Image.open(img_path).convert("RGB")
    dets, plotted = det.predict(img, conf=args.conf, imgsz=args.imgsz)
    plotted.save(args.out, quality=95)

    print(f"model={model_path}")
    print(f"image={img_path}")
    print(f"conf={args.conf}, imgsz={args.imgsz}")
    print(f"detections={len(dets)}")
    for d in dets[:20]:
        print(f"- {d.label} conf={d.confidence:.3f} xyxy={d.xyxy}")
    if len(dets) > 20:
        print(f"... more ({len(dets)-20})")
    print(f"saved={args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

