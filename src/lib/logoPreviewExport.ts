import type { Placement } from "./logoPreview";
import type { PreviewCalibration } from "./previewCalibration";
import { garmentLocalToImageNormalized } from "./previewCalibration";
import { loadImageElement } from "./logoPreview";
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

export async function generatePreviewImageBlob(options: {
  productImageSrc: string | null;
  fallbackSwatchColor?: string;
  mockupSide: MockupImageSide;
  baseCalibration: PreviewCalibration;
  logos: PreviewLogoOverlay[];
}): Promise<GeneratePreviewImageResult> {
  try {
    const width = 800;
    const height = 600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return { blob: null, usedProductPhoto: false, approximateFallback: false };
    }

    let drawRect: { x: number; y: number; width: number; height: number };
    let usedProductPhoto = false;

    if (options.productImageSrc) {
      try {
        const productImage = await loadImageElement(options.productImageSrc);
        drawRect = drawImageContained(context, productImage, width, height);
        usedProductPhoto = true;
      } catch {
        drawFallbackProductBackground(
          context,
          width,
          height,
          options.fallbackSwatchColor ?? "#dbeafe",
          options.baseCalibration,
        );
        const bounds = options.baseCalibration.garmentBounds;
        drawRect = {
          x: bounds.x * width,
          y: bounds.y * height,
          width: bounds.width * width,
          height: bounds.height * height,
        };
      }
    } else {
      drawFallbackProductBackground(
        context,
        width,
        height,
        options.fallbackSwatchColor ?? "#dbeafe",
        options.baseCalibration,
      );
      const bounds = options.baseCalibration.garmentBounds;
      drawRect = {
        x: bounds.x * width,
        y: bounds.y * height,
        width: bounds.width * width,
        height: bounds.height * height,
      };
    }

    const visibleLogos = options.logos.filter((logo) =>
      logoMatchesMockupSide(logo.placement, options.mockupSide),
    );

    for (const overlay of visibleLogos) {
      const artwork = await loadImageElement(overlay.artworkObjectUrl);
      drawLogoOverlay(context, artwork, overlay, drawRect);
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/png");
    });

    return {
      blob,
      usedProductPhoto,
      approximateFallback: !usedProductPhoto,
    };
  } catch {
    return { blob: null, usedProductPhoto: false, approximateFallback: false };
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
