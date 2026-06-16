import type { PreviewCalibration } from "./previewCalibration";
import { garmentLocalToImageNormalized } from "./previewCalibration";
import { loadImageElement, loadImageWithFallback } from "./logoPreview";

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

export async function generatePreviewImageBlob(options: {
  productImageSrc: string;
  productImageFallbackSrc?: string;
  fallbackSwatchColor?: string;
  artworkObjectUrl: string;
  logoGarmentPositionX: number;
  logoGarmentPositionY: number;
  logoWidthMm: number;
  calibration: PreviewCalibration;
}): Promise<Blob | null> {
  try {
    const width = 800;
    const height = 600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const productImage = await loadImageWithFallback(
      options.productImageSrc,
      options.productImageFallbackSrc,
    );

    let drawRect: { x: number; y: number; width: number; height: number };

    if (productImage) {
      drawRect = drawImageContained(context, productImage, width, height);
    } else {
      drawFallbackProductBackground(
        context,
        width,
        height,
        options.fallbackSwatchColor ?? "#dbeafe",
        options.calibration,
      );
      const bounds = options.calibration.garmentBounds;
      drawRect = {
        x: bounds.x * width,
        y: bounds.y * height,
        width: bounds.width * width,
        height: bounds.height * height,
      };
    }

    const artwork = await loadImageElement(options.artworkObjectUrl);
    const bounds = options.calibration.garmentBounds;
    const imageNorm = garmentLocalToImageNormalized(
      options.logoGarmentPositionX,
      options.logoGarmentPositionY,
      bounds,
    );

    const logoImageWidthFraction =
      (options.logoWidthMm / options.calibration.physicalWidthMm) * bounds.width;
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

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch {
    return null;
  }
}
