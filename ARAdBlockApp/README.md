# ARAdBlock

Design and starter implementation notes for an Android AR ad-blurring app targeting Samsung Galaxy S9 and other ARCore-capable devices.

## Goals
- Use the device camera and AR session to locate planes and anchor overlay geometry.
- Detect likely ad slots (e.g., billboards, banners, TV areas) in real time on-device.
- Blur or mask those regions in the live camera preview without blocking the rest of the scene.
- Keep the pipeline under ~16 ms per frame on a Snapdragon 845-class SoC by using GPU-accelerated image ops and lightweight detection models.

## Stack
- **ARCore** for pose estimation and scene understanding (anchors, plane detection, light estimation).
- **CameraX** for the live preview and `ImageAnalysis` pipeline.
- **TensorFlow Lite** (or ML Kit) for ad-slot detection; start with a small SSD MobileNet model trained on signage/ad frames.
- **OpenGL/SurfaceView overlay** or **RenderEffect/RenderScript** to apply blur in regions returned by the detector.
- **Kotlin + AndroidX** with a minimal Activity/Fragment and a custom overlay view.

## Running locally
1. Install Android Studio Iguana or newer and the Android SDK platforms 29–34.
2. Enable ARCore on the test device (Galaxy S9 supports ARCore 1.40+).
3. Clone this repository and open `ARAdBlockApp` as the project root.
4. Sync Gradle; accept prompts to download CameraX, ARCore, and TFLite dependencies.
5. Build & run on a physical device (emulators do not support ARCore camera passthrough).

## Key flows
1. **Camera frame ingestion**: CameraX `Preview` feeds the on-screen view; `ImageAnalysis` receives a YUV buffer for detection.
2. **Detection**: Frames are resized to the model input (e.g., 320×320) and run through TFLite. Each detection is converted to screen-space rectangles using the camera intrinsics and ARCore pose.
3. **Overlay & blur**: The overlay view stores the latest rectangles and blurs only those subregions of the preview. We avoid full-frame blurs to keep frame time low.
4. **Anchoring**: When ARCore identifies a plane behind a detection, we create an anchor so the blurred quad stays fixed relative to real-world objects as the device moves.
5. **Safety controls**: A toggle disables the filter, and a long-press clears detected anchors if the user wants to see the original scene.

## Model placeholder
The included Kotlin sample uses a mock detector that creates a static rectangle. Replace `MockAdDetector` with a real detector.
Suggested steps:
- Export a small SSD-MobileNet or YOLO-Nano model to `.tflite` with INT8 quantization.
- Use TFLite Task Library `ObjectDetector` with `numThreads = 4`.
- Filter detections by a confidence threshold (e.g., 0.5) and classes tagged as `ad`, `billboard`, `banner`, `poster`, or `screen`.

### Building a reference ad dataset
- Start from a public dataset that already contains ad-like objects, such as **MS COCO** (categories: billboard, tv, monitor) or **Open Images V7**. Favor signage-related labels (`Billboard`, `Banner`, `Poster`, `Advertisement`, `Electronic advertising display`) and ignore generic objects to keep the detector compact.
- Capture your own reference library with the S9 camera: indoor TV ads, outdoor billboards, bus-stop posters, and digital signage. Save stills and short clips at multiple distances and angles.
- Collect **negative** examples (artwork, menus, dashboards, branded apparel) so the detector learns what *not* to blur.
- Maintain an on-device **reference crop pack** of 30–50 high-quality ad snippets (PNG/JPEG) to run similarity checks or quick visual regression tests without needing the full dataset.
- Annotate with a tool such as Label Studio or CVAT. Use bounding boxes and standardize label names (e.g., `ad`, `billboard`, `poster`, `screen`, `banner`).
- Split data into train/val/test; reserve at least 15–20% for validation/testing so you can measure precision/recall on-device. Track precision/recall/F1 per label so you can tune thresholds before shipping.
- Augment with brightness changes, motion blur, perspective/affine warps, and JPEG compression artifacts to mimic handheld footage from the S9.

### Training + export
- Train a lightweight detector (e.g., SSD MobileNet V2 320x320) on the combined dataset. Keep batch sizes small for a quick loop on a single GPU.
- Export to TensorFlow Lite with INT8 quantization and include a label map (e.g., `labels.txt`) matching your annotated classes.
- Benchmark on-device with the **TFLite Benchmark Tool** on a Galaxy S9 to confirm frame times < 16 ms. If latency is too high, prune channels or switch to a smaller backbone (MobileNet V3 Small, YOLO-Nano).

### Wiring the model into the sample
- Place `model.tflite` and `labels.txt` in `app/src/main/assets/`.
- Swap `MockAdDetector` for a real detector that loads the model via the TFLite Task Library (`ObjectDetector.createFromFileAndOptions`).
- Map detections into screen-space `RectF` using the `ImageProxy` dimensions, then feed them into `OverlayView.updateRects` to blur only the detected regions.

## Privacy considerations
- All processing runs on-device; no frames are uploaded.
- Provide a disclosure on first launch that the app applies blurs over detected ads during camera use.
- Avoid storing frames; only keep ephemeral buffers.

## Next steps
- Swap in a real detector and benchmark on S9 hardware.
- Add a simple settings sheet to adjust blur strength and detection confidence.
- Capture a video clip of the blurred feed for sharing/debugging.
- Harden against low-light scenarios by adding exposure-compensation hints to CameraX.
