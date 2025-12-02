# ARAdBlock Workspace

This repo holds two entry points for experimenting with augmented-reality ad blurring:

- **Android prototype** in `ARAdBlockApp/` built with CameraX + SurfaceView overlay (see `ARAdBlockApp/README.md`).
- **Offline video post-processor** (`ARAdBlock.py`) that blurs ad regions in recorded clips using either a YOLO model or a mock fallback.

## Running the Python video script

1. Install dependencies (Python 3.10+ recommended):
   ```bash
   pip install -r requirements.txt
   ```
2. Place your input video and (optionally) a YOLO `.pt` model trained on ad-like labels (e.g., `ad`, `billboard`, `poster`).
3. Run the script, pointing to your paths. Example on Windows using the folder you mentioned:
   ```powershell
   cd C:\Users\Foxle\Downloads\art\SIU3d-codex-create-aradblock-video-processing-script
   python ARAdBlock.py "C:\Users\Foxle\Downloads\art\input.mp4" --model "C:\Users\Foxle\Downloads\art\ad-model.pt" --labels ad billboard banner poster screen --confidence 0.35
   ```
   If you skip `--model`, the script still runs with a mock bounding box so you can validate the blur pipeline.

The processed file saves as `<input>_processed.mp4` beside the original unless you pass an explicit output path.
