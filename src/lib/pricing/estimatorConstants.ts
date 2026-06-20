export const ESTIMATOR_PLACEMENTS = [
  "leftChest",
  "rightChest",
  "sleeve",
  "hatFront",
  "fullBack",
] as const;

export type EstimatorPlacement = (typeof ESTIMATOR_PLACEMENTS)[number];

export const ESTIMATOR_COMPLEXITIES = [
  "simple",
  "standard",
  "detailed",
  "dense",
] as const;

export type EstimatorComplexity = (typeof ESTIMATOR_COMPLEXITIES)[number];

export const ESTIMATOR_PLACEMENT_LABELS: Record<EstimatorPlacement, string> = {
  leftChest: "Left chest",
  rightChest: "Right chest",
  sleeve: "Sleeve",
  hatFront: "Hat front",
  fullBack: "Full back",
};

export const ESTIMATOR_COMPLEXITY_LABELS: Record<EstimatorComplexity, string> = {
  simple: "Simple",
  standard: "Standard",
  detailed: "Detailed",
  dense: "Dense",
};

export const PRICE_ESTIMATE_DISCLAIMER =
  "Estimated price. Final price confirmed after artwork review and stitch count.";
