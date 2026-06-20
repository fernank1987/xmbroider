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

export type ProductPricing = {
  enabled: boolean;
  costBasis: number;
  dealCost?: number;
  useDealCostForMargin?: boolean;
  setupFee: number;
  setupFeeWaivedAtQty: number | null;
  setupFeeLabel: string;
  quantityBreaks: ProductQuantityBreak[];
  placementMultipliers: ProductPlacementMultipliers;
  complexityMultipliers: ProductComplexityMultipliers;
  pricingVersion: string;
};

export const ST550_DEFAULT_PRICING: ProductPricing = {
  enabled: true,
  costBasis: 11.62,
  dealCost: 6,
  useDealCostForMargin: false,
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
  pricingVersion: PRODUCT_PRICING_VERSION,
};

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

  return {
    enabled: readBoolean(data.enabled, false),
    costBasis,
    dealCost: dealCost ?? undefined,
    useDealCostForMargin: readBoolean(data.useDealCostForMargin, false),
    setupFee,
    setupFeeWaivedAtQty,
    setupFeeLabel,
    quantityBreaks,
    placementMultipliers,
    complexityMultipliers,
    pricingVersion,
  };
}

export function serializeProductPricingForWrite(
  pricing: ProductPricing,
): Record<string, unknown> {
  return {
    enabled: pricing.enabled,
    costBasis: pricing.costBasis,
    dealCost: pricing.dealCost ?? null,
    useDealCostForMargin: pricing.useDealCostForMargin ?? false,
    setupFee: pricing.setupFee,
    setupFeeWaivedAtQty: pricing.setupFeeWaivedAtQty,
    setupFeeLabel: pricing.setupFeeLabel.trim(),
    quantityBreaks: pricing.quantityBreaks.map((entry) => ({
      minQty: entry.minQty,
      maxQty: entry.maxQty,
      blankUnitPrice: entry.blankUnitPrice,
      decorationBasePrice: entry.decorationBasePrice,
    })),
    placementMultipliers: { ...pricing.placementMultipliers },
    complexityMultipliers: { ...pricing.complexityMultipliers },
    pricingVersion: pricing.pricingVersion,
  };
}

export function cloneProductPricing(pricing: ProductPricing): ProductPricing {
  return {
    ...pricing,
    quantityBreaks: pricing.quantityBreaks.map((entry) => ({ ...entry })),
    placementMultipliers: { ...pricing.placementMultipliers },
    complexityMultipliers: { ...pricing.complexityMultipliers },
  };
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

  return null;
}
