from __future__ import annotations

import argparse
from pathlib import Path

import cv2

from detector import VideoDetector, draw_detections


BASE_DIR = Path(__file__).resolve().parent
FIRE_CONF = 0.08
FIRE_IOU = 0.50
FIRE_IMGSZ = 960
FIRE_FRAME_INTERVAL = 1
FIRE_WINDOW_NAME = "Detection - fire"
FIRE_BOX_COLOR = (0, 0, 255)
FIRE_FONT_SCALE = 1.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="本地视频目标检测")
    parser.add_argument(
        "--mode",
        required=True,
        choices=["person", "pest", "fire"],
        help="检测模式: person / pest / fire",
    )
    parser.add_argument(
        "--source",
        required=True,
        help="本地视频文件路径",
    )
    parser.add_argument(
        "--device",
        default=None,
        help="推理设备，例如 cpu、0、0,1",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=None,
        help="推理尺寸，可选",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=None,
        help="置信度阈值，可选",
    )
    parser.add_argument(
        "--iou",
        type=float,
        default=None,
        help="NMS 的 IoU 阈值，可选",
    )
    parser.add_argument(
        "--frame-interval",
        type=int,
        default=None,
        help="每隔多少帧执行一次检测，默认按模式自动设置",
    )
    return parser.parse_args()


def resolve_source(source: str) -> str:
    source_path = Path(source).expanduser()
    if not source_path.is_absolute():
        source_path = BASE_DIR / source_path
    return str(source_path)


def draw_fire_detections(
    frame_bgr,
    detections,
    box_color=FIRE_BOX_COLOR,
    text_color=(255, 255, 255),
    font_scale=FIRE_FONT_SCALE,
):
    output = frame_bgr.copy()
    height, width = output.shape[:2]
    base_thickness = max(3, int(round(min(width, height) / 260)))

    for detection in detections:
        x1, y1, x2, y2 = detection.xyxy
        label = f"fire {detection.confidence:.2f}"
        thickness = base_thickness
        overlay = output.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), box_color, -1)
        cv2.addWeighted(overlay, 0.12, output, 0.88, 0, output)
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


def main() -> None:
    args = parse_args()
    source = resolve_source(args.source)
    is_fire_mode = args.mode == "fire"
    detector_conf = args.conf if args.conf is not None else (FIRE_CONF if is_fire_mode else None)
    detector_iou = args.iou if args.iou is not None else (FIRE_IOU if is_fire_mode else None)

    detector = VideoDetector(
        mode=args.mode,
        device=args.device,
        conf=detector_conf,
        iou=detector_iou,
    )
    imgsz = args.imgsz if args.imgsz is not None else (FIRE_IMGSZ if is_fire_mode else detector.default_imgsz)
    frame_interval = (
        args.frame_interval
        if args.frame_interval is not None
        else (FIRE_FRAME_INTERVAL if is_fire_mode else detector.default_frame_interval)
    )
    window_name = FIRE_WINDOW_NAME if is_fire_mode else detector.window_name

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print("无法打开视频:", source)
        return

    frame_index = 0
    last_detections = []
    missed_detection_frames = 0
    allow_detection_hold = args.mode == "pest"
    detection_frames = 0
    total_detections = 0

    display_enabled = True
    try:
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    except cv2.error:
        display_enabled = False

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if frame_index % max(frame_interval, 1) == 0:
                current_detections = detector.detect(frame, imgsz=imgsz)
                if current_detections:
                    detection_frames += 1
                    total_detections += len(current_detections)
                if current_detections:
                    last_detections = current_detections
                    missed_detection_frames = 0
                elif allow_detection_hold and last_detections and missed_detection_frames < 1:
                    missed_detection_frames += 1
                else:
                    last_detections = current_detections
                    missed_detection_frames = 0

            if is_fire_mode:
                display_frame = draw_fire_detections(
                    frame,
                    last_detections,
                    box_color=FIRE_BOX_COLOR,
                    text_color=detector.text_color,
                    font_scale=FIRE_FONT_SCALE,
                )
            else:
                display_frame = draw_detections(
                    frame,
                    last_detections,
                    box_color=detector.box_color,
                    text_color=detector.text_color,
                )
            frame_index += 1
            if display_enabled:
                try:
                    cv2.imshow(window_name, display_frame)
                except cv2.error:
                    display_enabled = False

            if display_enabled and cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        if display_enabled:
            cv2.destroyAllWindows()
    print(
        f"mode={args.mode} conf={detector.conf:.2f} iou={detector.iou:.2f} "
        f"imgsz={imgsz} frame_interval={frame_interval} "
        f"detection_frames={detection_frames} total_detections={total_detections}"
    )


if __name__ == "__main__":
    main()
