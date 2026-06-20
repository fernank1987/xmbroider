import {
  PRODUCT_PRICING_VERSION,
  resolveEffectiveStitchPricing,
  resolveQuantityBreak,
  resolveSetupFee,
  ST550_DEFAULT_PRICING,
  type ProductPricing,
} from "./productPricing";
import {
  ESTIMATOR_COMPLEXITIES,
  ESTIMATOR_PLACEMENTS,
  type EstimatorComplexity,
  type EstimatorPlacement,
} from "./estimatorConstants";

export {
  ESTIMATOR_COMPLEXITIES,
  ESTIMATOR_PLACEMENTS,
  ESTIMATOR_PLACEMENT_LABELS,
  ESTIMATOR_COMPLEXITY_LABELS,
  PRICE_ESTIMATE_DISCLAIMER,
  type EstimatorComplexity,
  type EstimatorPlacement,
} from "./estimatorConstants";

export const PRICING_VERSION = PRODUCT_PRICING_VERSION;

export const ESTIMATE_MODES = ["basic", "stitchCount"] as const;
export type EstimateMode = (typeof ESTIMATE_MODES)[number];

export type EmbroideryEstimateInput = {
  productId: string;
  productSku: string;
  quantity: number;
  placement: EstimatorPlacement;
  complexity: EstimatorComplexity;
  pricing: ProductPricing;
  estimateMode?: EstimateMode;
  estimatedStitches?: number | null;
};

export type EmbroideryEstimateResult = {
  productId: string;
  productSku: string;
  quantity: number;
  placement: EstimatorPlacement;
  complexity: EstimatorComplexity;
  estimateMode: EstimateMode;
  estimatedStitches: number | null;
  ratePerThousand: number | null;
  minimumDecorationPrice: number | null;
  stitchPriceBeforePlacement: number | null;
  blankUnitPrice: number;
  decorationUnitPrice: number;
  setupFeeOriginal: number;
  setupFeeApplied: number;
  setupFeeWaived: boolean;
  setupFeeWaivedAtQty: number | null;
  blankSubtotal: number;
  decorationSubtotal: number;
  estimatedTotal: number;
  estimatedPerItem: number;
  pricingVersion: string;
  /** @deprecated Legacy quotes only — use setupFeeApplied */
  setupFee?: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeSku(productSku: string): string {
  return productSku.trim().toUpperCase() || "ST550";
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readEstimateMode(value: unknown): EstimateMode | null {
  return value === "basic" || value === "stitchCount" ? value : null;
}

function resolveDecorationPricing(
  input: EmbroideryEstimateInput,
  quantityBreak: ReturnType<typeof resolveQuantityBreak>,
): {
  decorationUnitPrice: number;
  estimateMode: EstimateMode;
  estimatedStitches: number | null;
  ratePerThousand: number | null;
  minimumDecorationPrice: number | null;
  stitchPriceBeforePlacement: number | null;
} {
  const estimateMode = input.estimateMode ?? "basic";
  const stitchCount =
    typeof input.estimatedStitches === "number" && input.estimatedStitches > 0
      ? Math.floor(input.estimatedStitches)
      : null;

  if (estimateMode === "stitchCount" && stitchCount !== null) {
    const stitchPricing = resolveEffectiveStitchPricing(input.pricing.stitchPricing);
    const rawStitchPrice = Math.max(
      stitchPricing.minimumDecorationPrice,
      (stitchCount / 1000) * stitchPricing.ratePerThousand,
    );
    const stitchPriceBeforePlacement = roundMoney(rawStitchPrice);
    const decorationUnitPrice = roundMoney(
      stitchPriceBeforePlacement * input.pricing.placementMultipliers[input.placement],
    );

    return {
      decorationUnitPrice,
      estimateMode: "stitchCount",
      estimatedStitches: stitchCount,
      ratePerThousand: stitchPricing.ratePerThousand,
      minimumDecorationPrice: stitchPricing.minimumDecorationPrice,
      stitchPriceBeforePlacement,
    };
  }

  const decorationUnitPrice = roundMoney(
    quantityBreak.decorationBasePrice *
      input.pricing.placementMultipliers[input.placement] *
      input.pricing.complexityMultipliers[input.complexity],
  );

  return {
    decorationUnitPrice,
    estimateMode: "basic",
    estimatedStitches: null,
    ratePerThousand: null,
    minimumDecorationPrice: null,
    stitchPriceBeforePlacement: null,
  };
}

/** Customer-facing embroidery estimate from product pricing config. */
export function calculateEmbroideryEstimate(
  input: EmbroideryEstimateInput,
): EmbroideryEstimateResult {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const productSku = normalizeSku(input.productSku);
  const pricing = input.pricing;

  const quantityBreak = resolveQuantityBreak(quantity, pricing.quantityBreaks);
  const blankUnitPrice = quantityBreak.blankUnitPrice;
  const decoration = resolveDecorationPricing(input, quantityBreak);

  const setup = resolveSetupFee(pricing, quantity);
  const blankSubtotal = roundMoney(blankUnitPrice * quantity);
  const decorationSubtotal = roundMoney(decoration.decorationUnitPrice * quantity);
  const estimatedTotal = roundMoney(
    blankSubtotal + decorationSubtotal + setup.setupFeeApplied,
  );
  const estimatedPerItem = roundMoney(estimatedTotal / quantity);

  return {
    productId: input.productId,
    productSku,
    quantity,
    placement: input.placement,
    complexity: input.complexity,
    estimateMode: decoration.estimateMode,
    estimatedStitches: decoration.estimatedStitches,
    ratePerThousand: decoration.ratePerThousand,
    minimumDecorationPrice: decoration.minimumDecorationPrice,
    stitchPriceBeforePlacement: decoration.stitchPriceBeforePlacement,
    blankUnitPrice: roundMoney(blankUnitPrice),
    decorationUnitPrice: decoration.decorationUnitPrice,
    setupFeeOriginal: roundMoney(setup.setupFeeOriginal),
    setupFeeApplied: roundMoney(setup.setupFeeApplied),
    setupFeeWaived: setup.setupFeeWaived,
    setupFeeWaivedAtQty: setup.setupFeeWaivedAtQty,
    blankSubtotal,
    decorationSubtotal,
    estimatedTotal,
    estimatedPerItem,
    pricingVersion: pricing.pricingVersion,
  };
}

/** Parses saved quote estimate; supports legacy `setupFee` field. */
export function parsePriceEstimate(value: unknown): EmbroideryEstimateResult | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const productSku = readString(data.productSku);
  const productId = readString(data.productId) ?? "";
  const quantity = readNumber(data.quantity);
  const placement = readString(data.placement);
  const complexity = readString(data.complexity);
  const blankUnitPrice = readNumber(data.blankUnitPrice);
  const decorationUnitPrice = readNumber(data.decorationUnitPrice);
  const blankSubtotal = readNumber(data.blankSubtotal);
  const decorationSubtotal = readNumber(data.decorationSubtotal);
  const estimatedTotal = readNumber(data.estimatedTotal);
  const estimatedPerItem = readNumber(data.estimatedPerItem);
  const pricingVersion = readString(data.pricingVersion);

  const setupFeeOriginal =
    readNumber(data.setupFeeOriginal) ?? readNumber(data.setupFee);
  const setupFeeApplied =
    readNumber(data.setupFeeApplied) ?? readNumber(data.setupFee);
  const setupFeeWaived = readBoolean(data.setupFeeWaived);
  const setupFeeWaivedAtQtyRaw = data.setupFeeWaivedAtQty;
  const setupFeeWaivedAtQty =
    setupFeeWaivedAtQtyRaw === null || setupFeeWaivedAtQtyRaw === undefined
      ? null
      : readNumber(setupFeeWaivedAtQtyRaw);

  const estimateMode = readEstimateMode(data.estimateMode) ?? "basic";
  const estimatedStitchesRaw = data.estimatedStitches;
  const estimatedStitches =
    estimatedStitchesRaw === null || estimatedStitchesRaw === undefined
      ? null
      : readNumber(estimatedStitchesRaw);
  const ratePerThousand =
    data.ratePerThousand === null || data.ratePerThousand === undefined
      ? null
      : readNumber(data.ratePerThousand);
  const minimumDecorationPrice =
    data.minimumDecorationPrice === null || data.minimumDecorationPrice === undefined
      ? null
      : readNumber(data.minimumDecorationPrice);
  const stitchPriceBeforePlacement =
    data.stitchPriceBeforePlacement === null || data.stitchPriceBeforePlacement === undefined
      ? null
      : readNumber(data.stitchPriceBeforePlacement);

  if (
    !productSku ||
    quantity === null ||
    quantity < 1 ||
    !placement ||
    !(ESTIMATOR_PLACEMENTS as readonly string[]).includes(placement) ||
    !complexity ||
    !(ESTIMATOR_COMPLEXITIES as readonly string[]).includes(complexity) ||
    blankUnitPrice === null ||
    decorationUnitPrice === null ||
    setupFeeOriginal === null ||
    setupFeeApplied === null ||
    blankSubtotal === null ||
    decorationSubtotal === null ||
    estimatedTotal === null ||
    estimatedPerItem === null ||
    !pricingVersion
  ) {
    return null;
  }

  const waived =
    setupFeeWaived ?? (setupFeeApplied === 0 && setupFeeOriginal > 0);

  return {
    productId,
    productSku,
    quantity: Math.floor(quantity),
    placement: placement as EmbroideryEstimateResult["placement"],
    complexity: complexity as EmbroideryEstimateResult["complexity"],
    estimateMode,
    estimatedStitches:
      estimatedStitches !== null && estimatedStitches > 0
        ? Math.floor(estimatedStitches)
        : null,
    ratePerThousand,
    minimumDecorationPrice,
    stitchPriceBeforePlacement,
    blankUnitPrice,
    decorationUnitPrice,
    setupFeeOriginal,
    setupFeeApplied,
    setupFeeWaived: waived,
    setupFeeWaivedAtQty,
    blankSubtotal,
    decorationSubtotal,
    estimatedTotal,
    estimatedPerItem,
    pricingVersion,
  };
}

export function formatEstimateCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export { ST550_DEFAULT_PRICING };
