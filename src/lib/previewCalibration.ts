import type { Placement } from "./logoPreview";
import { clamp } from "./logoPreview";
import type { PreviewProduct, ProductVariant } from "./logoPreviewProducts";

export type GarmentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreviewCalibration = {
  garmentBounds: GarmentBounds;
  physicalWidthMm: number;
  physicalHeightMm?: number;
};

export const DEFAULT_APPAREL_CALIBRATION: PreviewCalibration = {
  garmentBounds: { x: 0.25, y: 0.18, width: 0.5, height: 0.62 },
  physicalWidthMm: 530,
};

export const DEFAULT_HAT_CALIBRATION: PreviewCalibration = {
  garmentBounds: { x: 0.18, y: 0.2, width: 0.64, height: 0.45 },
  physicalWidthMm: 180,
};

/** Logo placement presets as percentages within the garment bounds (0–100). */
export const GARMENT_PLACEMENT_PRESETS: Record<Placement, { x: number; y: number }> = {
  left_chest: { x: 32, y: 38 },
  right_chest: { x: 68, y: 38 },
  center_chest: { x: 50, y: 42 },
  sleeve: { x: 18, y: 48 },
  hat_front: { x: 50, y: 58 },
};

export const MOCKUP_CONTAINER_ASPECT = 4 / 3;

export type PreviewCalibrationSource =
  | "custom-color"
  | "product-default"
  | "category-default";

/** @deprecated Use PreviewCalibrationSource */
export type CalibrationSource = PreviewCalibrationSource;

export type ResolvedPreviewCalibration = PreviewCalibration & {
  source: PreviewCalibrationSource;
};

export const PREVIEW_CALIBRATION_SOURCE_LABELS: Record<PreviewCalibrationSource, string> = {
  "custom-color": "Custom color calibration",
  "product-default": "Product default calibration",
  "category-default": "Category default calibration",
};

function isHatContext(product: PreviewProduct, placement?: Placement): boolean {
  if (placement === "hat_front") {
    return true;
  }
  const category = product.category?.toLowerCase() ?? "";
  return category.includes("hat") || category.includes("cap");
}

export function getPreviewCalibrationSource(
  variant: ProductVariant,
  product: PreviewProduct,
): PreviewCalibrationSource {
  if (variant.previewCalibration) {
    return "custom-color";
  }
  if (product.defaultPreviewCalibration) {
    return "product-default";
  }
  return "category-default";
}

export function resolveEffectivePreviewCalibration(
  variant: ProductVariant,
  product: PreviewProduct,
  placement?: Placement,
): PreviewCalibration {
  if (variant.previewCalibration) {
    return variant.previewCalibration;
  }
  if (product.defaultPreviewCalibration) {
    return product.defaultPreviewCalibration;
  }
  if (isHatContext(product, placement)) {
    return DEFAULT_HAT_CALIBRATION;
  }
  return DEFAULT_APPAREL_CALIBRATION;
}

export function resolvePreviewCalibration(
  variant: ProductVariant,
  product: PreviewProduct,
  placement?: Placement,
): ResolvedPreviewCalibration {
  return {
    ...resolveEffectivePreviewCalibration(variant, product, placement),
    source: getPreviewCalibrationSource(variant, product),
  };
}

export function hasCustomPreviewCalibration(variant: ProductVariant): boolean {
  return Boolean(variant.previewCalibration);
}

type ContainedImageScale = {
  widthScale: number;
  heightScale: number;
  xOffsetScale: number;
  yOffsetScale: number;
};

export function getContainedImageScale(
  containerAspect: number,
  imageAspect: number,
): ContainedImageScale {
  if (imageAspect > containerAspect) {
    const heightScale = containerAspect / imageAspect;
    return {
      widthScale: 1,
      heightScale,
      xOffsetScale: 0,
      yOffsetScale: (1 - heightScale) / 2,
    };
  }

  const widthScale = imageAspect / containerAspect;
  return {
    widthScale,
    heightScale: 1,
    xOffsetScale: (1 - widthScale) / 2,
    yOffsetScale: 0,
  };
}

export function garmentLocalToImageNormalized(
  localX: number,
  localY: number,
  bounds: GarmentBounds,
): { x: number; y: number } {
  return {
    x: bounds.x + (localX / 100) * bounds.width,
    y: bounds.y + (localY / 100) * bounds.height,
  };
}

export function imageNormalizedToGarmentLocal(
  normX: number,
  normY: number,
  bounds: GarmentBounds,
): { x: number; y: number } {
  return {
    x: ((normX - bounds.x) / bounds.width) * 100,
    y: ((normY - bounds.y) / bounds.height) * 100,
  };
}

export function imageNormalizedToContainerPercent(
  normX: number,
  normY: number,
  containerAspect: number,
  imageAspect: number,
): { x: number; y: number } {
  const scale = getContainedImageScale(containerAspect, imageAspect);
  return {
    x: (scale.xOffsetScale + normX * scale.widthScale) * 100,
    y: (scale.yOffsetScale + normY * scale.heightScale) * 100,
  };
}

export function containerPercentToImageNormalized(
  containerX: number,
  containerY: number,
  containerAspect: number,
  imageAspect: number,
): { x: number; y: number } {
  const scale = getContainedImageScale(containerAspect, imageAspect);
  return {
    x: (containerX / 100 - scale.xOffsetScale) / scale.widthScale,
    y: (containerY / 100 - scale.yOffsetScale) / scale.heightScale,
  };
}

export function containerPercentToGarmentLocal(
  containerX: number,
  containerY: number,
  bounds: GarmentBounds,
  containerAspect: number,
  imageAspect: number,
): { x: number; y: number } {
  const normalized = containerPercentToImageNormalized(
    containerX,
    containerY,
    containerAspect,
    imageAspect,
  );
  const local = imageNormalizedToGarmentLocal(normalized.x, normalized.y, bounds);
  return {
    x: clamp(local.x, 5, 95),
    y: clamp(local.y, 5, 95),
  };
}

export function garmentLocalToContainerPercent(
  localX: number,
  localY: number,
  bounds: GarmentBounds,
  containerAspect: number,
  imageAspect: number,
): { x: number; y: number } {
  const normalized = garmentLocalToImageNormalized(localX, localY, bounds);
  return imageNormalizedToContainerPercent(
    normalized.x,
    normalized.y,
    containerAspect,
    imageAspect,
  );
}

/** Logo width as a percentage of the mockup container width. */
export function logoWidthMmToContainerWidthPercent(
  logoWidthMm: number,
  calibration: PreviewCalibration,
  containerAspect: number,
  imageAspect: number,
): number {
  if (calibration.physicalWidthMm <= 0) {
    return 22;
  }

  const imageWidthFraction =
    (logoWidthMm / calibration.physicalWidthMm) * calibration.garmentBounds.width;
  const scale = getContainedImageScale(containerAspect, imageAspect);
  return clamp(imageWidthFraction * scale.widthScale * 100, 3, 85);
}

export function getGarmentPlacementPreset(placement: Placement): { x: number; y: number } {
  return GARMENT_PLACEMENT_PRESETS[placement];
}

export function calibrationBoundsToPercents(bounds: GarmentBounds): {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
} {
  return {
    xPercent: bounds.x * 100,
    yPercent: bounds.y * 100,
    widthPercent: bounds.width * 100,
    heightPercent: bounds.height * 100,
  };
}

export function calibrationFromPercents(
  xPercent: number,
  yPercent: number,
  widthPercent: number,
  heightPercent: number,
  physicalWidthMm: number,
  physicalHeightMm?: number | null,
): PreviewCalibration {
  const calibration: PreviewCalibration = {
    garmentBounds: clampGarmentBounds({
      x: xPercent / 100,
      y: yPercent / 100,
      width: widthPercent / 100,
      height: heightPercent / 100,
    }),
    physicalWidthMm,
  };
  if (typeof physicalHeightMm === "number") {
    calibration.physicalHeightMm = physicalHeightMm;
  }
  return calibration;
}

export const MIN_GARMENT_BOUND_SIZE = 0.05;

export function clampGarmentBounds(bounds: GarmentBounds): GarmentBounds {
  const width = clamp(bounds.width, MIN_GARMENT_BOUND_SIZE, 1);
  const height = clamp(bounds.height, MIN_GARMENT_BOUND_SIZE, 1);
  const x = clamp(bounds.x, 0, 1 - width);
  const y = clamp(bounds.y, 0, 1 - height);
  return { x, y, width, height };
}

export function getContainedImageRect(
  containerWidth: number,
  containerHeight: number,
  imageAspect: number,
): { x: number; y: number; width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || imageAspect <= 0) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  }

  const containerAspect = containerWidth / containerHeight;
  if (imageAspect > containerAspect) {
    const width = containerWidth;
    const height = containerWidth / imageAspect;
    return { x: 0, y: (containerHeight - height) / 2, width, height };
  }

  const height = containerHeight;
  const width = containerHeight * imageAspect;
  return { x: (containerWidth - width) / 2, y: 0, width, height };
}

export function getDefaultCalibrationForCategory(category: string): PreviewCalibration {
  const normalized = category.toLowerCase();
  if (normalized.includes("hat") || normalized.includes("cap")) {
    return DEFAULT_HAT_CALIBRATION;
  }
  return DEFAULT_APPAREL_CALIBRATION;
}
