import type { PreviewProduct } from "@/lib/logoPreviewProducts";
import {
  resolveEffectiveProductPricing,
  type ProductPricing,
} from "./productPricing";
import {
  calculateEmbroideryEstimate,
  type EmbroideryEstimateResult,
  type EstimatorComplexity,
  type EstimatorPlacement,
} from "./embroideryEstimator";
import { resolveProductSku } from "./previewPricing";

/** Resolves pricing for preview estimator (enabled product pricing or ST550 fallback). */
export function resolvePreviewProductPricing(
  product: Pick<PreviewProduct, "pricing">,
): ProductPricing {
  return resolveEffectiveProductPricing(product.pricing);
}

export function buildLiveEstimate(
  product: Pick<PreviewProduct, "id" | "productSku" | "label" | "pricing">,
  quantity: number,
  placement: EstimatorPlacement,
  complexity: EstimatorComplexity,
): EmbroideryEstimateResult {
  const pricing = resolvePreviewProductPricing(product);
  return calculateEmbroideryEstimate({
    productId: product.id,
    productSku: resolveProductSku(product as PreviewProduct),
    quantity: Math.max(1, quantity),
    placement,
    complexity,
    pricing,
  });
}
