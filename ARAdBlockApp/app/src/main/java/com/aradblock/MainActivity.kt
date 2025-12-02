package com.aradblock

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Paint
import android.graphics.RectF
import android.os.Bundle
import android.util.Size
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.ar.core.Session
import com.google.ar.core.exceptions.UnavailableException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

/**
 * Minimal AR ad-blurring prototype for ARAdBlock.
 *
 * This sample uses CameraX to stream frames into an ImageAnalysis pipeline and overlays
 * blurred rectangles on top of the PreviewView. A mock detector is used for now.
 */
class MainActivity : ComponentActivity() {
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private var overlayView: OverlayView? = null
    private var previewView: androidx.camera.view.PreviewView? = null
    private var arSession: Session? = null
    private val allowedAdLabels = setOf("ad", "billboard", "banner", "poster", "screen")
    private val adDetector: AdDetector by lazy {
        val primary = DatasetBackedDetector.tryCreate(
            context = this,
            allowedLabels = allowedAdLabels,
            scoreThreshold = 0.5f,
        )
        primary?.let { DetectorWithFallback(primary = it, fallback = MockAdDetector) }
            ?: MockAdDetector
    }

    private val requestPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startCamera(previewView)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = FrameLayout(this)
        previewView = androidx.camera.view.PreviewView(this)
        overlayView = OverlayView(this)
        root.addView(previewView)
        root.addView(overlayView)
        setContentView(root)

        ensureArSession()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera(previewView)
        } else {
            requestPermission.launch(Manifest.permission.CAMERA)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }

    private fun ensureArSession() {
        if (arSession != null) return
        try {
            arSession = Session(this)
        } catch (ex: UnavailableException) {
            // Surface gracefully in production. For now, fall back to camera-only mode.
            arSession = null
        }
    }

    private fun startCamera(previewView: androidx.camera.view.PreviewView? = this.previewView) {
        val pv = previewView ?: return
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder().build()
            val analysis = ImageAnalysis.Builder()
                .setTargetResolution(Size(1280, 720))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()

            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                val detections = adDetector.detect(imageProxy)
                lifecycleScope.launch(Dispatchers.Main) {
                    overlayView?.updateDetections(detections)
                }
                imageProxy.close()
            }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(this, cameraSelector, preview, analysis)
            preview.setSurfaceProvider(pv.surfaceProvider)
        }, ContextCompat.getMainExecutor(this))
    }
}

/** Simple overlay view that draws blurred rectangles over detected ads. */
class OverlayView(context: android.content.Context) : SurfaceView(context), SurfaceHolder.Callback {
    private val rectPaint = Paint().apply {
        color = 0x99_000000.toInt()
        isAntiAlias = true
    }
    private val blurPaint = Paint().apply {
        // Hardware accelerated blur (RenderEffect) would be better; use alpha overlay as fallback.
        color = 0x55_000000.toInt()
    }
    private val labelPaint = Paint().apply {
        color = android.graphics.Color.WHITE
        textSize = 32f
        isAntiAlias = true
    }
    private var detections: List<AdDetection> = emptyList()

    init {
        holder.addCallback(this)
        setZOrderOnTop(true)
        holder.setFormat(android.graphics.PixelFormat.TRANSLUCENT)
    }

    fun updateDetections(newDetections: List<AdDetection>) {
        detections = newDetections
        drawRects()
    }

    private fun drawRects() {
        val canvas = runCatching { holder.lockCanvas() }.getOrNull() ?: return
        try {
            canvas.drawColor(android.graphics.Color.TRANSPARENT, android.graphics.PorterDuff.Mode.CLEAR)
            detections.forEach { detection ->
                val rect = detection.box
                canvas.drawRoundRect(rect, 16f, 16f, blurPaint)
                canvas.drawRoundRect(rect, 16f, 16f, rectPaint)
                canvas.drawText(
                    "${'$'}{detection.label} (${String.format("%.2f", detection.score)})",
                    rect.left + 12f,
                    rect.top + 36f,
                    labelPaint,
                )
            }
        } finally {
            holder.unlockCanvasAndPost(canvas)
        }
    }

    override fun surfaceCreated(holder: SurfaceHolder) = Unit
    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) = drawRects()
    override fun surfaceDestroyed(holder: SurfaceHolder) = Unit
}

/** Simple detection data holder. */
data class AdDetection(val box: RectF, val label: String = "ad", val score: Float = 1f)

/**
 * Detector abstraction so we can swap a mock implementation for a model-backed one.
 */
interface AdDetector {
    fun detect(imageProxy: ImageProxy): List<AdDetection>
}

/** Replace this detector with a real TFLite/ML Kit implementation. */
object MockAdDetector : AdDetector {
    override fun detect(imageProxy: ImageProxy): List<AdDetection> {
        val width = imageProxy.width.toFloat()
        val height = imageProxy.height.toFloat()
        val boxWidth = width * 0.25f
        val boxHeight = height * 0.18f
        val left = width - boxWidth - 32f
        val top = 48f
        return listOf(AdDetection(RectF(left, top, left + boxWidth, top + boxHeight), label = "mock-ad", score = 0.8f))
    }
}

/**
 * Wraps a primary detector (e.g., TFLite) with a mock fallback so the overlay still renders
 * even if the model is missing or returns no boxes.
 */
class DetectorWithFallback(
    private val primary: AdDetector,
    private val fallback: AdDetector,
) : AdDetector {
    override fun detect(imageProxy: ImageProxy): List<AdDetection> {
        val primaryDetections = primary.detect(imageProxy)
        return if (primaryDetections.isNotEmpty()) primaryDetections else fallback.detect(imageProxy)
    }
}

/**
 * Skeleton for a dataset-backed detector. Wire this up after training on COCO/Open Images + custom ad captures.
 * - Load `model.tflite` and `labels.txt` from assets.
 * - Filter detections to the allowed labels.
 * - Convert bounding boxes into `RectF` in the input imageProxy coordinates.
 */
class DatasetBackedDetector(
    private val labels: List<String>,
    private val modelBytes: ByteArray,
    private val allowedLabels: Set<String>,
    private val scoreThreshold: Float = 0.5f,
) : AdDetector {
    override fun detect(imageProxy: ImageProxy): List<AdDetection> {
        val rawDetections = runCatching { runModel(imageProxy) }.getOrElse { emptyList() }
        return rawDetections
            .filter { detection -> allowedLabels.isEmpty() || allowedLabels.contains(detection.label) }
            .filter { detection -> detection.score >= scoreThreshold }
            .map { detection ->
                val rect = detection.normalizedBox.toImageSpace(imageProxy.width, imageProxy.height)
                AdDetection(rect, detection.label, detection.score)
            }
    }

    /** Placeholder for a TFLite Task Library inference call. */
    private fun runModel(imageProxy: ImageProxy): List<RawDetection> {
        // TODO: replace with real Task Library inference using modelBytes + labels.
        // Returning empty preserves the pipeline while allowing fallback detectors.
        return emptyList()
    }

    data class RawDetection(val normalizedBox: RectF, val label: String, val score: Float)

    private fun RectF.toImageSpace(width: Int, height: Int): RectF {
        val leftPx = (left.coerceIn(0f, 1f)) * width
        val topPx = (top.coerceIn(0f, 1f)) * height
        val rightPx = (right.coerceIn(0f, 1f)) * width
        val bottomPx = (bottom.coerceIn(0f, 1f)) * height
        return RectF(leftPx, topPx, rightPx, bottomPx)
    }

    companion object {
        fun tryCreate(
            context: Context,
            allowedLabels: Set<String>,
            scoreThreshold: Float,
            modelAssetPath: String = "model.tflite",
            labelAssetPath: String = "labels.txt",
        ): DatasetBackedDetector? {
            val assets = context.assets
            val modelBytes = runCatching { assets.open(modelAssetPath).use { it.readBytes() } }.getOrElse { return null }
            val labels = runCatching {
                assets.open(labelAssetPath).bufferedReader().readLines().filter { it.isNotBlank() }
            }.getOrElse { emptyList() }
            return DatasetBackedDetector(labels, modelBytes, allowedLabels, scoreThreshold)
        }
    }
}
