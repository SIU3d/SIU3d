"""ARAdBlock: Blur ad regions in saved videos with an optional YOLO model."""

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

import cv2

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover - tqdm is optional
    tqdm = None


Rect = Tuple[int, int, int, int]


@dataclass
class Detection:
    """Detection result in pixel coordinates."""

    box: Rect
    score: float
    label: str


class AdDetector:
    """Detector interface so we can swap implementations easily."""

    def detect(self, frame) -> List[Detection]:  # pragma: no cover - thin wrapper
        raise NotImplementedError


class MockAdDetector(AdDetector):
    """Fallback detector that returns a fixed rectangle."""

    def detect(self, frame) -> List[Detection]:
        height, width = frame.shape[:2]
        box_width = max(width // 5, 60)
        box_height = max(height // 8, 40)
        x1 = width - box_width - 20
        y1 = 20
        return [
            Detection(
                box=(x1, y1, box_width, box_height),
                score=0.8,
                label="mock-ad",
            )
        ]


class YoloAdDetector(AdDetector):
    """YOLO (Ultralytics) detector backed by a provided .pt model."""

    def __init__(self, model_path: Path, allowed_labels: Sequence[str], confidence: float):
        try:
            from ultralytics import YOLO
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise ImportError(
                "ultralytics is required for YOLO detection. Install with `pip install ultralytics`."
            ) from exc

        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        self.model = YOLO(str(model_path))
        self.allowed_labels = {label.lower() for label in allowed_labels}
        self.confidence = confidence

    def detect(self, frame) -> List[Detection]:
        results = self.model(frame, conf=self.confidence, verbose=False)[0]
        names = results.names
        detections: List[Detection] = []
        for box in results.boxes:
            score = float(box.conf.cpu())
            label_idx = int(box.cls.cpu())
            label = names.get(label_idx, str(label_idx)).lower()
            if self.allowed_labels and label not in self.allowed_labels:
                continue
            x1, y1, x2, y2 = (int(coord) for coord in box.xyxy.cpu().tolist()[0])
            detections.append(
                Detection(
                    box=(x1, y1, x2 - x1, y2 - y1),
                    score=score,
                    label=label,
                )
            )
        return detections


def load_video(path: Path) -> cv2.VideoCapture:
    """Open a video file for reading."""

    if not path.exists():
        raise FileNotFoundError(f"Video not found: {path}")

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Failed to open video: {path}")
    return capture


def obscure_regions(frame, regions: Iterable[Rect], kernel_size: int) -> None:
    """Apply a blur to the given regions in-place."""

    if kernel_size % 2 == 0:
        raise ValueError("Blur kernel size must be odd (e.g., 21, 31, 41)")

    for x, y, w, h in regions:
        x_end = min(x + w, frame.shape[1])
        y_end = min(y + h, frame.shape[0])
        sub_frame = frame[y:y_end, x:x_end]
        if sub_frame.size == 0:
            continue
        blurred = cv2.GaussianBlur(sub_frame, (kernel_size, kernel_size), 0)
        frame[y:y_end, x:x_end] = blurred


def choose_detector(model_path: Path | None, allowed_labels: Sequence[str], confidence: float) -> AdDetector:
    """Return a YOLO detector when available, otherwise fall back to the mock path."""

    if model_path is None:
        return MockAdDetector()

    try:
        return YoloAdDetector(model_path, allowed_labels, confidence)
    except Exception as exc:  # pragma: no cover - runtime guard for CLI UX
        print(f"Warning: falling back to mock detector ({exc})", file=sys.stderr)
        return MockAdDetector()


def process_video(
    input_path: Path,
    output_path: Path,
    detector: AdDetector,
    blur_kernel: int,
) -> None:
    """Load a video, obscure detected ad regions, and save to a new file."""

    capture = load_video(input_path)
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT)) or None
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    progress = tqdm(total=total_frames, desc="Blurring ads") if tqdm else None
    try:
        while True:
            success, frame = capture.read()
            if not success:
                break
            detections = detector.detect(frame)
            obscure_regions(frame, (d.box for d in detections), kernel_size=blur_kernel)
            writer.write(frame)
            if progress:
                progress.update(1)
    finally:
        capture.release()
        writer.release()
        if progress:
            progress.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ARAdBlock video post-processor")
    parser.add_argument("input", type=Path, help="Path to input video")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        help="Path to save processed video (default: <input>_processed.mp4)",
    )
    parser.add_argument(
        "--model",
        type=Path,
        help="Path to a YOLO .pt model trained to spot ads; defaults to mock boxes when omitted",
    )
    parser.add_argument(
        "--labels",
        nargs="*",
        default=["ad", "billboard", "banner", "poster", "screen"],
        help="Allowed label names for filtering detections (ignored for the mock detector)",
    )
    parser.add_argument(
        "--confidence",
        type=float,
        default=0.4,
        help="Minimum detection confidence for YOLO models",
    )
    parser.add_argument(
        "--blur-kernel",
        type=int,
        default=31,
        help="Odd kernel size for Gaussian blur (larger = stronger blur)",
    )
    return parser


def main(argv: List[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    output_path = args.output
    if output_path is None:
        output_path = args.input.with_name(args.input.stem + "_processed.mp4")

    detector = choose_detector(args.model, allowed_labels=args.labels, confidence=args.confidence)
    process_video(args.input, output_path, detector=detector, blur_kernel=args.blur_kernel)
    print(f"Processed video saved to {output_path}")


if __name__ == "__main__":
    main()
