"""
ARAdBlock: Simple post-processing script to obscure ad regions in videos.
"""
import argparse
from pathlib import Path
from typing import Iterable, List, Tuple

import cv2


Rect = Tuple[int, int, int, int]


def load_video(path: Path) -> cv2.VideoCapture:
    """
    Open a video file for reading.

    Args:
        path: Path to the video file.

    Returns:
        An opened cv2.VideoCapture instance.

    Raises:
        FileNotFoundError: If the file does not exist.
        RuntimeError: If the video cannot be opened.
    """
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {path}")

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Failed to open video: {path}")
    return capture


def mock_detect_ads(frame) -> List[Rect]:
    """
    Placeholder ad detection.

    For now, this returns a single fixed-size rectangle near the top-right
    corner as a mock advertisement region. Replace with a real detector
    when available.
    """
    height, width = frame.shape[:2]
    box_width = max(width // 5, 60)
    box_height = max(height // 8, 40)
    x1 = width - box_width - 20
    y1 = 20
    return [(x1, y1, box_width, box_height)]


def obscure_regions(frame, regions: Iterable[Rect]) -> None:
    """Apply a blur to the given regions in-place."""
    for x, y, w, h in regions:
        x_end = min(x + w, frame.shape[1])
        y_end = min(y + h, frame.shape[0])
        sub_frame = frame[y:y_end, x:x_end]
        if sub_frame.size == 0:
            continue
        blurred = cv2.GaussianBlur(sub_frame, (31, 31), 0)
        frame[y:y_end, x:x_end] = blurred


def process_video(input_path: Path, output_path: Path) -> None:
    """
    Load a video, obscure detected ad regions, and save to a new file.
    """
    capture = load_video(input_path)
    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    try:
        while True:
            success, frame = capture.read()
            if not success:
                break
            regions = mock_detect_ads(frame)
            obscure_regions(frame, regions)
            writer.write(frame)
    finally:
        capture.release()
        writer.release()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ARAdBlock video post-processor")
    parser.add_argument("input", type=Path, help="Path to input video")
    parser.add_argument(
        "output",
        type=Path,
        nargs="?",
        help="Path to save processed video (default: <input>_processed.mp4)",
    )
    return parser


def main(argv: List[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    output_path = args.output
    if output_path is None:
        output_path = args.input.with_name(args.input.stem + "_processed.mp4")

    process_video(args.input, output_path)
    print(f"Processed video saved to {output_path}")


if __name__ == "__main__":
    main()
