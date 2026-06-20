import type { PreviewProduct } from "@/lib/logoPreviewProducts";
import {
  resolveEffectiveProductPricing,
  type ProductPricing,
} from "./productPricing";
import {
  calculateEmbroideryEstimate,
  type EmbroideryEstimateResult,
  type EstimateMode,
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

export type BuildLiveEstimateInput = {
  product: Pick<PreviewProduct, "id" | "productSku" | "label" | "pricing">;
  quantity: number;
  placement: EstimatorPlacement;
  complexity: EstimatorComplexity;
  estimateMode?: EstimateMode;
  estimatedStitches?: number | null;
};

export function buildLiveEstimate({
  product,
  quantity,
  placement,
  complexity,
  estimateMode,
  estimatedStitches,
}: BuildLiveEstimateInput): EmbroideryEstimateResult {
  const pricing = resolvePreviewProductPricing(product);
  return calculateEmbroideryEstimate({
    productId: product.id,
    productSku: resolveProductSku(product as PreviewProduct),
    quantity: Math.max(1, quantity),
    placement,
    complexity,
    pricing,
    estimateMode,
    estimatedStitches,
  });
}
