import type { Placement } from "./logoPreview";
import type { PreviewCalibration } from "./previewCalibration";
import { garmentLocalToImageNormalized } from "./previewCalibration";
import type { MockupImageSide } from "./productMockupImage";

export const PREVIEW_EXPORT_WIDTH = 800;
export const PREVIEW_EXPORT_HEIGHT = 600;

export type LogoOverlayDrawInput = {
  label?: string;
  logoGarmentPositionX: number;
  logoGarmentPositionY: number;
  logoWidthMm: number;
  calibration: PreviewCalibration;
  placement: Placement;
};

export function computeContainedDrawRect(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;
  return { x, y, width, height };
}

export function computeFallbackGarmentDrawRect(
  canvasWidth: number,
  canvasHeight: number,
  calibration: PreviewCalibration,
): { x: number; y: number; width: number; height: number } {
  const bounds = calibration.garmentBounds;
  return {
    x: bounds.x * canvasWidth,
    y: bounds.y * canvasHeight,
    width: bounds.width * canvasWidth,
    height: bounds.height * canvasHeight,
  };
}

export function computeLogoOverlayRect(
  drawRect: { x: number; y: number; width: number; height: number },
  overlay: LogoOverlayDrawInput,
  artworkWidth: number,
  artworkHeight: number,
): { left: number; top: number; width: number; height: number } {
  const bounds = overlay.calibration.garmentBounds;
  const imageNorm = garmentLocalToImageNormalized(
    overlay.logoGarmentPositionX,
    overlay.logoGarmentPositionY,
    bounds,
  );

  const logoImageWidthFraction =
    (overlay.logoWidthMm / overlay.calibration.physicalWidthMm) * bounds.width;
  const logoWidthPx = logoImageWidthFraction * drawRect.width;
  const logoHeightPx = (logoWidthPx * artworkHeight) / artworkWidth;

  const centerX = drawRect.x + imageNorm.x * drawRect.width;
  const centerY = drawRect.y + imageNorm.y * drawRect.height;

  return {
    left: centerX - logoWidthPx / 2,
    top: centerY - logoHeightPx / 2,
    width: logoWidthPx,
    height: logoHeightPx,
  };
}

export function logoMatchesMockupSide(placement: Placement, side: MockupImageSide): boolean {
  return side === "back" ? placement === "back" : placement !== "back";
}
