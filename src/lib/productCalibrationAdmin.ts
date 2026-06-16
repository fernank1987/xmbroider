import type { Product, ProductColor } from "./firebase/productRepository";
import {
  calibrationBoundsToPercents,
  calibrationFromPercents,
  getDefaultCalibrationForCategory,
  type PreviewCalibration,
  type PreviewCalibrationSource,
} from "./previewCalibration";

export type CalibrationFormValues = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  physicalWidthMm: number;
};

export function getColorCalibrationSource(
  product: Product,
  color: ProductColor,
): PreviewCalibrationSource {
  if (color.previewCalibration) {
    return "custom-color";
  }
  if (product.defaultPreviewCalibration) {
    return "product-default";
  }
  return "category-default";
}

export function getColorCalibrationStatusLabel(
  product: Product,
  color: ProductColor,
): string {
  switch (getColorCalibrationSource(product, color)) {
    case "custom-color":
      return "Custom";
    case "product-default":
      return "Product default";
    case "category-default":
      return "Category default";
  }
}

export function getEffectiveColorCalibration(
  product: Product,
  color: ProductColor,
): PreviewCalibration {
  if (color.previewCalibration) {
    return color.previewCalibration;
  }
  if (product.defaultPreviewCalibration) {
    return product.defaultPreviewCalibration;
  }
  return getDefaultCalibrationForCategory(product.category);
}

export function getCalibrationFormValues(
  calibration: PreviewCalibration,
): CalibrationFormValues {
  const percents = calibrationBoundsToPercents(calibration.garmentBounds);
  return {
    xPercent: percents.xPercent,
    yPercent: percents.yPercent,
    widthPercent: percents.widthPercent,
    heightPercent: percents.heightPercent,
    physicalWidthMm: calibration.physicalWidthMm,
  };
}

export function getProductDefaultCalibrationValues(
  product: Product,
): CalibrationFormValues {
  const calibration =
    product.defaultPreviewCalibration ??
    getDefaultCalibrationForCategory(product.category);
  return getCalibrationFormValues(calibration);
}

export function getColorCalibrationFormValues(
  product: Product,
  color: ProductColor,
): CalibrationFormValues {
  return getCalibrationFormValues(getEffectiveColorCalibration(product, color));
}

export function calibrationFromFormValues(
  values: CalibrationFormValues,
): PreviewCalibration {
  return calibrationFromPercents(
    values.xPercent,
    values.yPercent,
    values.widthPercent,
    values.heightPercent,
    values.physicalWidthMm,
  );
}

export function getFirstFrontImageColor(product: Product): ProductColor | null {
  return product.colors.find((color) => color.frontImageUrl) ?? null;
}
