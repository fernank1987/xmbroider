import type { Placement } from "@/lib/logoPreview";
import type { PreviewProduct } from "@/lib/logoPreviewProducts";
import {
  ESTIMATOR_PLACEMENTS,
  type EstimatorComplexity,
  type EstimatorPlacement,
} from "./embroideryEstimator";

/** Maps mockup placement keys to embroidery estimator placement keys. */
export function mapPreviewPlacementToEstimator(
  placement: Placement,
): EstimatorPlacement {
  switch (placement) {
    case "left_chest":
    case "center_chest":
      return "leftChest";
    case "right_chest":
      return "rightChest";
    case "sleeve":
      return "sleeve";
    case "hat_front":
      return "hatFront";
    case "back":
      return "fullBack";
    default:
      return "leftChest";
  }
}

export function isEstimatorPlacement(value: string): value is EstimatorPlacement {
  return (ESTIMATOR_PLACEMENTS as readonly string[]).includes(value);
}

export function isEstimatorComplexity(value: string): value is EstimatorComplexity {
  return ["simple", "standard", "detailed", "dense"].includes(value);
}

/** Resolves catalog SKU for pricing; unknown products fall back to ST550. */
export function resolveProductSku(product: PreviewProduct): string {
  const sku = product.productSku?.trim().toUpperCase();
  if (sku) {
    return sku;
  }
  if (product.id.toLowerCase() === "st550") {
    return "ST550";
  }
  if (product.label.toUpperCase().includes("ST550")) {
    return "ST550";
  }
  return "ST550";
}
