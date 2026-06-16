import type { Placement } from "./logoPreview";
import { loadImageElement } from "./logoPreview";
import type { PreviewCalibration } from "./previewCalibration";
import { garmentLocalToImageNormalized } from "./previewCalibration";
import { APPROXIMATE_MOCKUP_WARNING, toAbsoluteAssetUrl } from "./productMockupImage";
import type { MockupImageSide } from "./productMockupImage";

export type PreviewLogoOverlay = {
  artworkObjectUrl: string;
  logoGarmentPositionX: number;
  logoGarmentPositionY: number;
  logoWidthMm: number;
  calibration: PreviewCalibration;
  placement: Placement;
};

export type GeneratePreviewImageResult = {
  blob: Blob | null;
  usedProductPhoto: boolean;
  approximateFallback: boolean;
  errorMessage: string | null;
};

function drawImageContained(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;
  context.drawImage(image, x, y, width, height);
  return { x, y, width, height };
}

function drawFallbackProductBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  swatchColor: string,
  calibration: PreviewCalibration,
) {
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);

  const bounds = calibration.garmentBounds;
  const shirtX = bounds.x * width;
  const shirtY = bounds.y * height;
  const shirtWidth = bounds.width * width;
  const shirtHeight = bounds.height * height;

  context.fillStyle = swatchColor;
  context.fillRect(shirtX, shirtY, shirtWidth, shirtHeight);

  context.strokeStyle = "#94a3b8";
  context.lineWidth = 2;
  context.strokeRect(shirtX, shirtY, shirtWidth, shirtHeight);
}

function drawLogoOverlay(
  context: CanvasRenderingContext2D,
  artwork: HTMLImageElement,
  overlay: PreviewLogoOverlay,
  drawRect: { x: number; y: number; width: number; height: number },
) {
  const bounds = overlay.calibration.garmentBounds;
  const imageNorm = garmentLocalToImageNormalized(
    overlay.logoGarmentPositionX,
    overlay.logoGarmentPositionY,
    bounds,
  );

  const logoImageWidthFraction =
    (overlay.logoWidthMm / overlay.calibration.physicalWidthMm) * bounds.width;
  const logoWidthPx = logoImageWidthFraction * drawRect.width;
  const logoHeightPx = (logoWidthPx * artwork.height) / artwork.width;

  const centerX = drawRect.x + imageNorm.x * drawRect.width;
  const centerY = drawRect.y + imageNorm.y * drawRect.height;

  context.drawImage(
    artwork,
    centerX - logoWidthPx / 2,
    centerY - logoHeightPx / 2,
    logoWidthPx,
    logoHeightPx,
  );
}

function logoMatchesMockupSide(placement: Placement, side: MockupImageSide): boolean {
  return side === "back" ? placement === "back" : placement !== "back";
}

function fallbackDrawRect(
  width: number,
  height: number,
  calibration: PreviewCalibration,
) {
  const bounds = calibration.garmentBounds;
  return {
    x: bounds.x * width,
    y: bounds.y * height,
    width: bounds.width * width,
    height: bounds.height * height,
  };
}

async function loadProductImageForExport(
  productImageSrc: string,
): Promise<{ image: HTMLImageElement; drawRectSource: "photo" } | { error: string }> {
  const absoluteSrc = toAbsoluteAssetUrl(productImageSrc);
  if (!absoluteSrc) {
    return { error: "Product photo URL is missing." };
  }

  try {
    const image = await loadImageElement(absoluteSrc);
    return { image, drawRectSource: "photo" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load product photo for export.";
    return { error: message };
  }
}

export async function generatePreviewImageBlob(options: {
  productImageSrc: string | null;
  fallbackSwatchColor?: string;
  mockupSide: MockupImageSide;
  baseCalibration: PreviewCalibration;
  logos: PreviewLogoOverlay[];
}): Promise<GeneratePreviewImageResult> {
  const width = 800;
  const height = 600;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return {
        blob: null,
        usedProductPhoto: false,
        approximateFallback: false,
        errorMessage: "Canvas is unavailable in this browser.",
      };
    }

    let drawRect: { x: number; y: number; width: number; height: number };
    let usedProductPhoto = false;
    let exportError: string | null = null;

    if (options.productImageSrc) {
      const productLoad = await loadProductImageForExport(options.productImageSrc);
      if ("image" in productLoad) {
        drawRect = drawImageContained(context, productLoad.image, width, height);
        usedProductPhoto = true;
      } else {
        exportError = productLoad.error;
        drawFallbackProductBackground(
          context,
          width,
          height,
          options.fallbackSwatchColor ?? "#dbeafe",
          options.baseCalibration,
        );
        drawRect = fallbackDrawRect(width, height, options.baseCalibration);
      }
    } else {
      drawFallbackProductBackground(
        context,
        width,
        height,
        options.fallbackSwatchColor ?? "#dbeafe",
        options.baseCalibration,
      );
      drawRect = fallbackDrawRect(width, height, options.baseCalibration);
    }

    const visibleLogos = options.logos.filter((logo) =>
      logoMatchesMockupSide(logo.placement, options.mockupSide),
    );

    for (const overlay of visibleLogos) {
      try {
        const artworkSrc = toAbsoluteAssetUrl(overlay.artworkObjectUrl) ?? overlay.artworkObjectUrl;
        const artwork = await loadImageElement(artworkSrc);
        drawLogoOverlay(context, artwork, overlay, drawRect);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load logo artwork for export.";
        exportError = exportError ? `${exportError} ${message}` : message;
      }
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/png");
    });

    if (!blob) {
      return {
        blob: null,
        usedProductPhoto,
        approximateFallback: !usedProductPhoto,
        errorMessage: exportError ?? "Composite preview image could not be encoded.",
      };
    }

    return {
      blob,
      usedProductPhoto,
      approximateFallback: !usedProductPhoto,
      errorMessage: !usedProductPhoto
        ? exportError ?? APPROXIMATE_MOCKUP_WARNING
        : exportError,
    };
  } catch (error) {
    return {
      blob: null,
      usedProductPhoto: false,
      approximateFallback: false,
      errorMessage:
        error instanceof Error ? error.message : "Composite preview export failed.",
    };
  }
}

/** @deprecated Use generatePreviewImageBlob with logos array. */
export async function generateSingleLogoPreviewImageBlob(options: {
  productImageSrc: string;
  productImageFallbackSrc?: string;
  fallbackSwatchColor?: string;
  artworkObjectUrl: string;
  logoGarmentPositionX: number;
  logoGarmentPositionY: number;
  logoWidthMm: number;
  calibration: PreviewCalibration;
  placement?: Placement;
}): Promise<Blob | null> {
  const result = await generatePreviewImageBlob({
    productImageSrc: options.productImageSrc || null,
    fallbackSwatchColor: options.fallbackSwatchColor,
    mockupSide: options.placement === "back" ? "back" : "front",
    baseCalibration: options.calibration,
    logos: [
      {
        artworkObjectUrl: options.artworkObjectUrl,
        logoGarmentPositionX: options.logoGarmentPositionX,
        logoGarmentPositionY: options.logoGarmentPositionY,
        logoWidthMm: options.logoWidthMm,
        calibration: options.calibration,
        placement: options.placement ?? "left_chest",
      },
    ],
  });
  return result.blob;
}
