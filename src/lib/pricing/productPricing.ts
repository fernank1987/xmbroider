import {
  ESTIMATOR_COMPLEXITIES,
  ESTIMATOR_PLACEMENTS,
  type EstimatorComplexity,
  type EstimatorPlacement,
} from "./estimatorConstants";

export const PRODUCT_PRICING_VERSION = "product-pricing-v1";

export type ProductQuantityBreak = {
  minQty: number;
  maxQty: number | null;
  blankUnitPrice: number;
  decorationBasePrice: number;
};

export type ProductPlacementMultipliers = Record<EstimatorPlacement, number>;

export type ProductComplexityMultipliers = Record<EstimatorComplexity, number>;

export type ProductStitchPricing = {
  enabled: boolean;
  ratePerThousand: number;
  minimumDecorationPrice: number;
  defaultEstimatedStitches: number | null;
};

export type QuantityBreakMarginPreview = {
  blankUnitPrice: number;
  landedCostBasis: number;
  grossProfitPerBlank: number;
  grossMarginPercent: number;
};

export type ProductPricing = {
  enabled: boolean;
  costBasis: number;
  dealCost?: number;
  useDealCostForMargin?: boolean;
  inboundShippingPerItem?: number;
  landedCostBasis?: number;
  targetGrossMarginPercent?: number;
  setupFee: number;
  setupFeeWaivedAtQty: number | null;
  setupFeeLabel: string;
  quantityBreaks: ProductQuantityBreak[];
  placementMultipliers: ProductPlacementMultipliers;
  complexityMultipliers: ProductComplexityMultipliers;
  stitchPricing: ProductStitchPricing;
  pricingVersion: string;
};

export const ST550_DEFAULT_STITCH_PRICING: ProductStitchPricing = {
  enabled: true,
  ratePerThousand: 1.25,
  minimumDecorationPrice: 10,
  defaultEstimatedStitches: null,
};

export const ST550_DEFAULT_PRICING: ProductPricing = {
  enabled: true,
  costBasis: 11.62,
  dealCost: 6,
  useDealCostForMargin: false,
  inboundShippingPerItem: 1.5,
  landedCostBasis: 13.12,
  targetGrossMarginPercent: 35,
  setupFee: 45,
  setupFeeWaivedAtQty: 10,
  setupFeeLabel: "Setup/Digitizing",
  quantityBreaks: [
    { minQty: 1, maxQty: 5, blankUnitPrice: 22, decorationBasePrice: 12 },
    { minQty: 6, maxQty: 9, blankUnitPrice: 20, decorationBasePrice: 11 },
    { minQty: 10, maxQty: 23, blankUnitPrice: 19, decorationBasePrice: 10 },
    { minQty: 24, maxQty: 47, blankUnitPrice: 18, decorationBasePrice: 9.5 },
    { minQty: 48, maxQty: null, blankUnitPrice: 17.5, decorationBasePrice: 8.5 },
  ],
  placementMultipliers: {
    leftChest: 1,
    rightChest: 1,
    sleeve: 0.9,
    hatFront: 1.2,
    fullBack: 2.5,
  },
  complexityMultipliers: {
    simple: 0.9,
    standard: 1,
    detailed: 1.25,
    dense: 1.5,
  },
  stitchPricing: ST550_DEFAULT_STITCH_PRICING,
  pricingVersion: PRODUCT_PRICING_VERSION,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Admin-only: supplier cost plus inbound shipping per blank. */
export function computeLandedCostBasis(
  costBasis: number,
  inboundShippingPerItem?: number,
): number {
  const shipping =
    typeof inboundShippingPerItem === "number" && Number.isFinite(inboundShippingPerItem)
      ? inboundShippingPerItem
      : 0;
  return roundMoney(costBasis + shipping);
}

/** Admin-only margin preview for a quantity break blank price. */
export function computeQuantityBreakMarginPreview(
  blankUnitPrice: number,
  landedCostBasis: number,
): QuantityBreakMarginPreview {
  const grossProfitPerBlank = roundMoney(blankUnitPrice - landedCostBasis);
  const grossMarginPercent =
    blankUnitPrice > 0
      ? roundPercent((grossProfitPerBlank / blankUnitPrice) * 100)
      : 0;

  return {
    blankUnitPrice,
    landedCostBasis,
    grossProfitPerBlank,
    grossMarginPercent,
  };
}

/** Applies computed landed cost to pricing (admin-only field). */
export function withComputedLandedCostBasis(pricing: ProductPricing): ProductPricing {
  return {
    ...pricing,
    landedCostBasis: computeLandedCostBasis(
      pricing.costBasis,
      pricing.inboundShippingPerItem,
    ),
  };
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseQuantityBreak(value: unknown): ProductQuantityBreak | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const minQty = readNumber(data.minQty) ?? readNumber(data.min);
  const maxQtyRaw = data.maxQty ?? data.max;
  const maxQty =
    maxQtyRaw === null || maxQtyRaw === undefined
      ? null
      : readNumber(maxQtyRaw);
  const blankUnitPrice = readNumber(data.blankUnitPrice);
  const decorationBasePrice =
    readNumber(data.decorationBasePrice) ?? readNumber(data.leftChestDecoration);

  if (
    minQty === null ||
    blankUnitPrice === null ||
    decorationBasePrice === null
  ) {
    return null;
  }

  return {
    minQty,
    maxQty,
    blankUnitPrice,
    decorationBasePrice,
  };
}

function parsePlacementMultipliers(
  value: unknown,
): ProductPlacementMultipliers | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const result = {} as ProductPlacementMultipliers;

  for (const key of ESTIMATOR_PLACEMENTS) {
    const multiplier = readNumber(data[key]);
    if (multiplier === null) {
      return null;
    }
    result[key] = multiplier;
  }

  return result;
}

function parseComplexityMultipliers(
  value: unknown,
): ProductComplexityMultipliers | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const result = {} as ProductComplexityMultipliers;

  for (const key of ESTIMATOR_COMPLEXITIES) {
    const multiplier = readNumber(data[key]);
    if (multiplier === null) {
      return null;
    }
    result[key] = multiplier;
  }

  return result;
}

function parseStitchPricing(value: unknown): ProductStitchPricing | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const ratePerThousand = readNumber(data.ratePerThousand);
  const minimumDecorationPrice = readNumber(data.minimumDecorationPrice);
  const defaultEstimatedStitchesRaw = data.defaultEstimatedStitches;
  const defaultEstimatedStitches =
    defaultEstimatedStitchesRaw === null || defaultEstimatedStitchesRaw === undefined
      ? null
      : readNumber(defaultEstimatedStitchesRaw);

  if (ratePerThousand === null || minimumDecorationPrice === null) {
    return null;
  }

  return {
    enabled: readBoolean(data.enabled, false),
    ratePerThousand,
    minimumDecorationPrice,
    defaultEstimatedStitches,
  };
}

/** Parses Firestore pricing object; returns null when incomplete. */
export function parseProductPricing(value: unknown): ProductPricing | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const costBasis = readNumber(data.costBasis);
  const setupFee = readNumber(data.setupFee);
  const setupFeeLabel = readString(data.setupFeeLabel);
  const pricingVersion = readString(data.pricingVersion);
  const setupFeeWaivedAtQtyRaw = data.setupFeeWaivedAtQty;
  const setupFeeWaivedAtQty =
    setupFeeWaivedAtQtyRaw === null || setupFeeWaivedAtQtyRaw === undefined
      ? null
      : readNumber(setupFeeWaivedAtQtyRaw);

  const quantityBreaks = Array.isArray(data.quantityBreaks)
    ? data.quantityBreaks
        .map(parseQuantityBreak)
        .filter((entry): entry is ProductQuantityBreak => entry !== null)
    : [];

  const placementMultipliers = parsePlacementMultipliers(data.placementMultipliers);
  const complexityMultipliers = parseComplexityMultipliers(data.complexityMultipliers);

  if (
    costBasis === null ||
    setupFee === null ||
    !setupFeeLabel ||
    !pricingVersion ||
    quantityBreaks.length === 0 ||
    !placementMultipliers ||
    !complexityMultipliers
  ) {
    return null;
  }

  const dealCost = readNumber(data.dealCost);
  const inboundShippingPerItem = readNumber(data.inboundShippingPerItem);
  const targetGrossMarginPercent = readNumber(data.targetGrossMarginPercent);
  const stitchPricing =
    parseStitchPricing(data.stitchPricing) ?? ST550_DEFAULT_STITCH_PRICING;

  const pricing: ProductPricing = {
    enabled: readBoolean(data.enabled, false),
    costBasis,
    dealCost: dealCost ?? undefined,
    useDealCostForMargin: readBoolean(data.useDealCostForMargin, false),
    inboundShippingPerItem: inboundShippingPerItem ?? undefined,
    targetGrossMarginPercent: targetGrossMarginPercent ?? undefined,
    setupFee,
    setupFeeWaivedAtQty,
    setupFeeLabel,
    quantityBreaks,
    placementMultipliers,
    complexityMultipliers,
    stitchPricing,
    pricingVersion,
  };

  return withComputedLandedCostBasis(pricing);
}

export function serializeProductPricingForWrite(
  pricing: ProductPricing,
): Record<string, unknown> {
  const normalized = withComputedLandedCostBasis(pricing);

  return {
    enabled: normalized.enabled,
    costBasis: normalized.costBasis,
    dealCost: normalized.dealCost ?? null,
    useDealCostForMargin: normalized.useDealCostForMargin ?? false,
    inboundShippingPerItem: normalized.inboundShippingPerItem ?? null,
    landedCostBasis: normalized.landedCostBasis ?? null,
    targetGrossMarginPercent: normalized.targetGrossMarginPercent ?? null,
    setupFee: normalized.setupFee,
    setupFeeWaivedAtQty: normalized.setupFeeWaivedAtQty,
    setupFeeLabel: normalized.setupFeeLabel.trim(),
    quantityBreaks: normalized.quantityBreaks.map((entry) => ({
      minQty: entry.minQty,
      maxQty: entry.maxQty,
      blankUnitPrice: entry.blankUnitPrice,
      decorationBasePrice: entry.decorationBasePrice,
    })),
    placementMultipliers: { ...normalized.placementMultipliers },
    complexityMultipliers: { ...normalized.complexityMultipliers },
    stitchPricing: {
      enabled: normalized.stitchPricing.enabled,
      ratePerThousand: normalized.stitchPricing.ratePerThousand,
      minimumDecorationPrice: normalized.stitchPricing.minimumDecorationPrice,
      defaultEstimatedStitches: normalized.stitchPricing.defaultEstimatedStitches,
    },
    pricingVersion: normalized.pricingVersion,
  };
}

export function cloneProductPricing(pricing: ProductPricing): ProductPricing {
  return withComputedLandedCostBasis({
    ...pricing,
    quantityBreaks: pricing.quantityBreaks.map((entry) => ({ ...entry })),
    placementMultipliers: { ...pricing.placementMultipliers },
    complexityMultipliers: { ...pricing.complexityMultipliers },
    stitchPricing: { ...pricing.stitchPricing },
  });
}

/** Returns stitch pricing config for estimates (product config or ST550 fallback). */
export function resolveEffectiveStitchPricing(
  stitchPricing: ProductStitchPricing | null | undefined,
): ProductStitchPricing {
  if (stitchPricing?.enabled) {
    return stitchPricing;
  }
  return { ...ST550_DEFAULT_STITCH_PRICING };
}

/** Returns enabled product pricing or ST550 fallback defaults. */
export function resolveEffectiveProductPricing(
  pricing: ProductPricing | null | undefined,
): ProductPricing {
  if (pricing?.enabled) {
    return pricing;
  }
  return cloneProductPricing(ST550_DEFAULT_PRICING);
}

export function resolveQuantityBreak(
  quantity: number,
  breaks: ProductQuantityBreak[],
): ProductQuantityBreak {
  const match = breaks.find(
    (entry) =>
      quantity >= entry.minQty &&
      (entry.maxQty === null || quantity <= entry.maxQty),
  );
  return match ?? breaks[breaks.length - 1];
}

export type SetupFeeResolution = {
  setupFeeOriginal: number;
  setupFeeApplied: number;
  setupFeeWaived: boolean;
  setupFeeWaivedAtQty: number | null;
};

export function resolveSetupFee(
  pricing: ProductPricing,
  quantity: number,
): SetupFeeResolution {
  const setupFeeOriginal = pricing.setupFee;
  const waivedAt = pricing.setupFeeWaivedAtQty;

  if (waivedAt === null) {
    return {
      setupFeeOriginal,
      setupFeeApplied: setupFeeOriginal,
      setupFeeWaived: false,
      setupFeeWaivedAtQty: null,
    };
  }

  if (quantity >= waivedAt) {
    return {
      setupFeeOriginal,
      setupFeeApplied: 0,
      setupFeeWaived: true,
      setupFeeWaivedAtQty: waivedAt,
    };
  }

  return {
    setupFeeOriginal,
    setupFeeApplied: setupFeeOriginal,
    setupFeeWaived: false,
    setupFeeWaivedAtQty: waivedAt,
  };
}

export function validateProductPricing(
  pricing: ProductPricing | null | undefined,
): string | null {
  if (!pricing) {
    return null;
  }

  if (pricing.costBasis < 0) {
    return "Cost basis cannot be negative.";
  }
  if (pricing.dealCost !== undefined && pricing.dealCost < 0) {
    return "Deal cost cannot be negative.";
  }
  if (
    pricing.inboundShippingPerItem !== undefined &&
    pricing.inboundShippingPerItem < 0
  ) {
    return "Inbound shipping per item cannot be negative.";
  }
  if (
    pricing.targetGrossMarginPercent !== undefined &&
    pricing.targetGrossMarginPercent < 0
  ) {
    return "Target gross margin cannot be negative.";
  }
  if (pricing.setupFee < 0) {
    return "Setup fee cannot be negative.";
  }
  if (
    pricing.setupFeeWaivedAtQty !== null &&
    (pricing.setupFeeWaivedAtQty < 1 || !Number.isInteger(pricing.setupFeeWaivedAtQty))
  ) {
    return "Waive setup fee at quantity must be empty or a whole number of 1 or more.";
  }
  if (!pricing.setupFeeLabel.trim()) {
    return "Setup fee label is required.";
  }
  if (pricing.quantityBreaks.length === 0) {
    return "At least one quantity break is required.";
  }

  for (const [index, entry] of pricing.quantityBreaks.entries()) {
    if (entry.minQty < 1 || !Number.isInteger(entry.minQty)) {
      return `Quantity break ${index + 1}: min qty must be at least 1.`;
    }
    if (entry.maxQty !== null) {
      if (!Number.isInteger(entry.maxQty) || entry.maxQty < entry.minQty) {
        return `Quantity break ${index + 1}: max qty must be at least min qty.`;
      }
    } else if (index !== pricing.quantityBreaks.length - 1) {
      return "Only the last quantity break can have an empty max qty.";
    }
    if (entry.blankUnitPrice < 0 || entry.decorationBasePrice < 0) {
      return `Quantity break ${index + 1}: prices cannot be negative.`;
    }
  }

  for (const key of ESTIMATOR_PLACEMENTS) {
    const value = pricing.placementMultipliers[key];
    if (value < 0) {
      return `${key} placement multiplier cannot be negative.`;
    }
  }

  for (const key of ESTIMATOR_COMPLEXITIES) {
    const value = pricing.complexityMultipliers[key];
    if (value < 0) {
      return `${key} complexity multiplier cannot be negative.`;
    }
  }

  const stitch = pricing.stitchPricing;
  if (stitch.ratePerThousand < 0) {
    return "Rate per thousand stitches cannot be negative.";
  }
  if (stitch.minimumDecorationPrice < 0) {
    return "Minimum embroidery charge cannot be negative.";
  }
  if (
    stitch.defaultEstimatedStitches !== null &&
    (stitch.defaultEstimatedStitches < 1 ||
      !Number.isInteger(stitch.defaultEstimatedStitches))
  ) {
    return "Default estimated stitches must be empty or a positive whole number.";
  }

  return null;
}
