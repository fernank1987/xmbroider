import { toBlob } from "html-to-image";
import { captureMockupStageWithCanvas } from "./mockupCanvasCapture";
import {
  flushAnimationFrames,
  getStageDimensions,
  inlineStageImagesForCapture,
  isStageVisible,
  waitForStageImages,
} from "./mockupCaptureImages";

export {
  COMPOSITE_PREVIEW_EXPORT_ERROR,
  type MockupCanvasCaptureResult,
} from "./mockupCanvasCapture";

export type MockupDomCaptureResult =
  | { blob: Blob; error: null }
  | { blob: null; error: string };

export type CompositePreviewUploadResult = {
  previewCompositeUrl: string;
  previewCompositeStoragePath: string;
  previewImageUrl: string;
  previewImageStoragePath: string;
};

const LOG_PREFIX = "[mockup-dom-capture]";

function log(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  if (details) {
    console.log(LOG_PREFIX, message, details);
  } else {
    console.log(LOG_PREFIX, message);
  }
}

function sanitizeCaptureError(message: string): string {
  const normalized = message.trim();
  if (!normalized) {
    return "Composite preview export failed.";
  }
  if (normalized.length > 120) {
    return "Composite preview export failed.";
  }
  return normalized;
}

/** Fallback capture using html-to-image when manual canvas capture fails. */
async function captureMockupStageWithHtmlToImage(
  element: HTMLElement,
): Promise<MockupDomCaptureResult> {
  let restoreImages: (() => void) | null = null;

  try {
    restoreImages = await inlineStageImagesForCapture(element);
    await flushAnimationFrames(1);

    log("html-to-image fallback start");
    const blob = await toBlob(element, {
      cacheBust: true,
      pixelRatio: 2,
      type: "image/png",
      backgroundColor: "#f8fafc",
      skipFonts: true,
      filter: (node) => {
        if (node instanceof HTMLElement && node.dataset.previewPlaceholder === "true") {
          return false;
        }
        return true;
      },
    });

    if (!blob || blob.size === 0) {
      return { blob: null, error: "Composite preview export failed." };
    }

    log("html-to-image fallback succeeded", { blobSize: blob.size });
    return { blob, error: null };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Composite preview export failed.";
    log("html-to-image fallback failed", { message });
    return { blob: null, error: sanitizeCaptureError(message) };
  } finally {
    restoreImages?.();
  }
}

/** Captures the preview stage, preferring manual canvas compositing. */
export async function captureMockupStageAsPng(
  element: HTMLElement | null,
): Promise<MockupDomCaptureResult> {
  if (!element) {
    return { blob: null, error: "Capture target missing." };
  }

  const dimensions = getStageDimensions(element);
  if (!isStageVisible(element)) {
    return { blob: null, error: "Capture target has no visible size." };
  }

  const canvasCapture = await captureMockupStageWithCanvas(element);
  if (canvasCapture.blob) {
    log("using manual canvas capture", dimensions);
    return canvasCapture;
  }

  log("manual canvas capture failed, trying html-to-image fallback", {
    error: canvasCapture.error,
  });

  await waitForStageImages(element).catch(() => undefined);
  const fallbackCapture = await captureMockupStageWithHtmlToImage(element);
  if (fallbackCapture.blob) {
    return fallbackCapture;
  }

  return {
    blob: null,
    error: canvasCapture.error || fallbackCapture.error || "Composite preview export failed.",
  };
}

/** Captures the mockup stage and uploads the PNG to quote storage. */
export async function captureAndUploadCompositePreview(options: {
  siteId: string;
  quoteRequestId: string;
  stageElement: HTMLElement | null;
  upload: (
    siteId: string,
    quoteRequestId: string,
    blob: Blob,
  ) => Promise<{ url: string; path: string }>;
}): Promise<
  | { ok: true; result: CompositePreviewUploadResult }
  | { ok: false; error: string }
> {
  log("upload flow started", { quoteRequestId: options.quoteRequestId });

  const capture = await captureMockupStageAsPng(options.stageElement);
  if (!capture.blob) {
    log("upload skipped, capture failed", { error: capture.error });
    return { ok: false, error: capture.error };
  }

  try {
    log("upload start", { quoteRequestId: options.quoteRequestId });
    const upload = await options.upload(
      options.siteId,
      options.quoteRequestId,
      capture.blob,
    );
    log("upload success URL", {
      previewCompositeUrl: upload.url,
      previewCompositeStoragePath: upload.path,
    });

    return {
      ok: true,
      result: {
        previewCompositeUrl: upload.url,
        previewCompositeStoragePath: upload.path,
        previewImageUrl: upload.url,
        previewImageStoragePath: upload.path,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Composite preview upload failed.";
    log("upload failed", { message });
    return { ok: false, error: message };
  }
}
