import {
  flushAnimationFrames,
  getStageDimensions,
  isStageVisible,
  sourceUrlToDataUrl,
  waitForStageImages,
} from "./mockupCaptureImages";

export const COMPOSITE_PREVIEW_EXPORT_ERROR = "Composite preview export failed.";

export type MockupCanvasCaptureResult =
  | { blob: Blob; error: null }
  | { blob: null; error: string };

const PIXEL_RATIO = 2;
const DEFAULT_STAGE_BACKGROUND = "#f8fafc";
const LOG_PREFIX = "[mockup-canvas-capture]";

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
    return COMPOSITE_PREVIEW_EXPORT_ERROR;
  }
  if (normalized.length > 120) {
    return COMPOSITE_PREVIEW_EXPORT_ERROR;
  }
  return normalized;
}

function readStageBackgroundColor(stage: HTMLElement): string {
  const background = window.getComputedStyle(stage).backgroundColor;
  if (!background || background === "rgba(0, 0, 0, 0)" || background === "transparent") {
    return DEFAULT_STAGE_BACKGROUND;
  }
  return background;
}

function computeObjectContainRect(
  naturalWidth: number,
  naturalHeight: number,
  boxWidth: number,
  boxHeight: number,
): { x: number; y: number; width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { x: 0, y: 0, width: boxWidth, height: boxHeight };
  }

  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}

function getRelativeBox(
  stageRect: DOMRect,
  elementRect: DOMRect,
  pixelRatio: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: (elementRect.left - stageRect.left) * pixelRatio,
    y: (elementRect.top - stageRect.top) * pixelRatio,
    width: elementRect.width * pixelRatio,
    height: elementRect.height * pixelRatio,
  };
}

async function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        reject(new Error("Decoded image has zero size."));
        return;
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error("Unable to decode image data."));
    image.src = dataUrl;
  });
}

async function convertDomImageToDataUrl(
  img: HTMLImageElement,
  label: string,
): Promise<string> {
  const source = img.currentSrc || img.src;
  if (!source) {
    throw new Error(`${label} is missing a source URL.`);
  }

  try {
    const dataUrl = await sourceUrlToDataUrl(source);
    log("image data URL conversion success", { label });
    return dataUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image conversion failed.";
    log("image data URL conversion failure", { label, message });
    throw new Error(`${label}: ${message}`);
  }
}

type PreparedCanvasImage = {
  label: string;
  image: HTMLImageElement;
  box: { x: number; y: number; width: number; height: number };
};

async function prepareCanvasImage(
  stageRect: DOMRect,
  img: HTMLImageElement,
  label: string,
): Promise<PreparedCanvasImage> {
  const dataUrl = await convertDomImageToDataUrl(img, label);
  const loaded = await loadImageElement(dataUrl);
  const box = getRelativeBox(stageRect, img.getBoundingClientRect(), PIXEL_RATIO);
  const contained = computeObjectContainRect(
    loaded.naturalWidth,
    loaded.naturalHeight,
    box.width,
    box.height,
  );

  return {
    label,
    image: loaded,
    box: {
      x: box.x + contained.x,
      y: box.y + contained.y,
      width: contained.width,
      height: contained.height,
    },
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/** Captures the visible preview stage by manually compositing product + logos on canvas. */
export async function captureMockupStageWithCanvas(
  stage: HTMLElement | null,
): Promise<MockupCanvasCaptureResult> {
  log("capture started");

  if (!stage) {
    log("capture target missing");
    return { blob: null, error: "Capture target missing." };
  }

  const dimensions = getStageDimensions(stage);
  log("stage width/height", dimensions);

  if (!isStageVisible(stage)) {
    return { blob: null, error: "Capture target has no visible size." };
  }

  try {
    await flushAnimationFrames(2);
    await waitForStageImages(stage);

    const productImage = stage.querySelector<HTMLImageElement>(
      'img[data-mockup-product-image="true"]',
    );
    if (!productImage) {
      log("product image missing");
      return { blob: null, error: "Product image missing from preview stage." };
    }
    log("product image found");

    const logoImages = Array.from(
      stage.querySelectorAll<HTMLImageElement>('img[data-mockup-logo-image="true"]'),
    );
    log("logo images found", { count: logoImages.length });

    const stageRect = stage.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(stageRect.width * PIXEL_RATIO));
    canvas.height = Math.max(1, Math.round(stageRect.height * PIXEL_RATIO));

    const context = canvas.getContext("2d");
    if (!context) {
      return { blob: null, error: "Canvas is unavailable in this browser." };
    }

    context.fillStyle = readStageBackgroundColor(stage);
    context.fillRect(0, 0, canvas.width, canvas.height);

    const productLayer = await prepareCanvasImage(stageRect, productImage, "Product image");
    context.drawImage(
      productLayer.image,
      productLayer.box.x,
      productLayer.box.y,
      productLayer.box.width,
      productLayer.box.height,
    );

    for (const logoImage of logoImages) {
      const label = logoImage.dataset.logoLabel || logoImage.alt || "Logo overlay";
      const logoLayer = await prepareCanvasImage(stageRect, logoImage, label);
      context.drawImage(
        logoLayer.image,
        logoLayer.box.x,
        logoLayer.box.y,
        logoLayer.box.width,
        logoLayer.box.height,
      );
    }

    const blob = await canvasToBlob(canvas);
    if (!blob || blob.size === 0) {
      log("canvas blob missing");
      return { blob: null, error: COMPOSITE_PREVIEW_EXPORT_ERROR };
    }

    log("canvas blob created", { blobSize: blob.size });
    return { blob, error: null };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : COMPOSITE_PREVIEW_EXPORT_ERROR;
    log("capture failed", { message });
    return { blob: null, error: sanitizeCaptureError(message) };
  }
}
