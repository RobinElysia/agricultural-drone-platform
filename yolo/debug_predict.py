from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from detector import YoloDetector


def main() -> int:
    parser = argparse.ArgumentParser(description="本地快速验证权重是否可正常出框")
    parser.add_argument("--model", required=True, help="权重路径，例如 models/pest.pt")
    parser.add_argument("--image", required=True, help="图片路径，例如 test.jpg")
    parser.add_argument("--conf", type=float, default=0.05, help="置信度阈值")
    parser.add_argument("--imgsz", type=int, default=960, help="推理尺寸")
    parser.add_argument("--out", default="debug_result.jpg", help="结果输出路径")
    args = parser.parse_args()

    model_path = Path(args.model)
    image_path = Path(args.image)
    if not model_path.exists():
        raise FileNotFoundError(f"找不到模型: {model_path}")
    if not image_path.exists():
        raise FileNotFoundError(f"找不到图片: {image_path}")

    detector = YoloDetector(model_path, conf=args.conf)
    detections, plotted = detector.predict(
        Image.open(image_path).convert("RGB"),
        conf=args.conf,
        imgsz=args.imgsz,
    )
    plotted.save(args.out, quality=95)

    print(f"model={model_path}")
    print(f"image={image_path}")
    print(f"conf={args.conf} imgsz={args.imgsz}")
    print(f"detections={len(detections)}")
    for item in detections[:20]:
        print(f"- {item.label} conf={item.confidence:.3f} xyxy={item.xyxy}")
    if len(detections) > 20:
        print(f"... more ({len(detections) - 20})")
    print(f"saved={args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
