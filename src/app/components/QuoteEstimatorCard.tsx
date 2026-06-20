"use client";

import type { PreviewProduct } from "@/lib/logoPreviewProducts";
import {
  ESTIMATOR_COMPLEXITIES,
  ESTIMATOR_COMPLEXITY_LABELS,
  ESTIMATOR_PLACEMENTS,
  ESTIMATOR_PLACEMENT_LABELS,
  formatEstimateCurrency,
  PRICE_ESTIMATE_DISCLAIMER,
  type EstimateMode,
  type EstimatorComplexity,
  type EstimatorPlacement,
} from "@/lib/pricing/embroideryEstimator";
import {
  buildLiveEstimate,
  resolvePreviewProductPricing,
} from "@/lib/pricing/previewEstimate";
import { resolveEffectiveStitchPricing } from "@/lib/pricing/productPricing";

type QuoteEstimatorCardProps = {
  product: PreviewProduct;
  quantity: number;
  placement: EstimatorPlacement;
  complexity: EstimatorComplexity;
  estimateMode: EstimateMode;
  estimatedStitches: number | null;
  disabled?: boolean;
  onQuantityChange: (quantity: number) => void;
  onPlacementChange: (placement: EstimatorPlacement) => void;
  onComplexityChange: (complexity: EstimatorComplexity) => void;
  onEstimateModeChange: (mode: EstimateMode) => void;
  onEstimatedStitchesChange: (stitches: number | null) => void;
};

function EstimateLine({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 text-sm ${
        emphasis ? "font-semibold text-foreground" : "text-muted"
      }`}
    >
      <span>{label}</span>
      <span className={emphasis ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

function formatStitchCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export { buildLiveEstimate };

export default function QuoteEstimatorCard({
  product,
  quantity,
  placement,
  complexity,
  estimateMode,
  estimatedStitches,
  disabled = false,
  onQuantityChange,
  onPlacementChange,
  onComplexityChange,
  onEstimateModeChange,
  onEstimatedStitchesChange,
}: QuoteEstimatorCardProps) {
  const pricing = resolvePreviewProductPricing(product);
  const stitchPricing = resolveEffectiveStitchPricing(pricing.stitchPricing);
  const usingProductPricing = product.pricing?.enabled === true;
  const estimate = buildLiveEstimate({
    product,
    quantity,
    placement,
    complexity,
    estimateMode,
    estimatedStitches,
  });
  const setupLabel = pricing.setupFeeLabel || "Setup/Digitizing";
  const isStitchCountMode = estimate.estimateMode === "stitchCount";

  const inputClassName =
    "mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

  const setupWaiverNote = pricing.setupFeeWaivedAtQty
    ? estimate.setupFeeWaived
      ? `Waived because quantity is ${pricing.setupFeeWaivedAtQty}+.`
      : `Setup fee waived at ${pricing.setupFeeWaivedAtQty}+ items.`
    : null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-foreground">Price estimate</h2>
      <p className="mt-1 text-sm text-muted">
        Ballpark embroidery pricing for your quantity and placement. Not a final invoice.
      </p>
      {!usingProductPricing && (
        <p className="mt-2 text-xs text-muted">
          Using ST550 default pricing until product pricing is enabled in admin.
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="estimate-mode" className="block text-sm font-medium text-foreground">
          Pricing mode
        </label>
        <select
          id="estimate-mode"
          value={estimateMode}
          disabled={disabled}
          onChange={(event) => onEstimateModeChange(event.target.value as EstimateMode)}
          className={inputClassName}
        >
          <option value="basic">Basic estimate</option>
          <option value="stitchCount">Stitch count estimate</option>
        </select>
      </div>

      <div className={`mt-4 grid gap-4 ${estimateMode === "basic" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div>
          <label htmlFor="estimate-quantity" className="block text-sm font-medium text-foreground">
            Quantity
          </label>
          <input
            id="estimate-quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            disabled={disabled}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              onQuantityChange(Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1);
            }}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="estimate-placement" className="block text-sm font-medium text-foreground">
            Placement
          </label>
          <select
            id="estimate-placement"
            value={placement}
            disabled={disabled}
            onChange={(event) => onPlacementChange(event.target.value as EstimatorPlacement)}
            className={inputClassName}
          >
            {ESTIMATOR_PLACEMENTS.map((option) => (
              <option key={option} value={option}>
                {ESTIMATOR_PLACEMENT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        {estimateMode === "basic" && (
          <div>
            <label htmlFor="estimate-complexity" className="block text-sm font-medium text-foreground">
              Design complexity
            </label>
            <select
              id="estimate-complexity"
              value={complexity}
              disabled={disabled}
              onChange={(event) => onComplexityChange(event.target.value as EstimatorComplexity)}
              className={inputClassName}
            >
              {ESTIMATOR_COMPLEXITIES.map((option) => (
                <option key={option} value={option}>
                  {ESTIMATOR_COMPLEXITY_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {estimateMode === "stitchCount" && (
        <div className="mt-4">
          <label
            htmlFor="estimate-stitch-count"
            className="block text-sm font-medium text-foreground"
          >
            Estimated stitch count
          </label>
          <input
            id="estimate-stitch-count"
            type="number"
            min={1}
            step={1}
            value={estimatedStitches ?? ""}
            disabled={disabled}
            placeholder={
              stitchPricing.defaultEstimatedStitches
                ? String(stitchPricing.defaultEstimatedStitches)
                : "e.g. 13500"
            }
            onChange={(event) => {
              const trimmed = event.target.value.trim();
              if (!trimmed) {
                onEstimatedStitchesChange(null);
                return;
              }
              const parsed = Number(trimmed);
              onEstimatedStitchesChange(
                Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : null,
              );
            }}
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-muted">
            Use this when you already know the stitch count from digitizing software.
          </p>
        </div>
      )}

      <div className="mt-5 space-y-2 rounded-xl border border-border bg-background/60 p-4">
        <EstimateLine
          label="Blank shirts"
          value={formatEstimateCurrency(estimate.blankSubtotal)}
        />
        {isStitchCountMode && estimate.estimatedStitches !== null ? (
          <div className="space-y-1 border-b border-border pb-2">
            <EstimateLine
              label="Stitch count"
              value={formatStitchCount(estimate.estimatedStitches)}
            />
            {estimate.ratePerThousand !== null && (
              <EstimateLine
                label="Rate"
                value={`${formatEstimateCurrency(estimate.ratePerThousand)} / 1,000 stitches`}
              />
            )}
            <EstimateLine
              label="Embroidery service"
              value={`${formatEstimateCurrency(estimate.decorationUnitPrice)} each`}
            />
            <EstimateLine
              label="Embroidery subtotal"
              value={formatEstimateCurrency(estimate.decorationSubtotal)}
            />
          </div>
        ) : (
          <EstimateLine
            label="Embroidery service"
            value={formatEstimateCurrency(estimate.decorationSubtotal)}
          />
        )}
        <div className="space-y-1">
          <EstimateLine
            label={setupLabel}
            value={
              estimate.setupFeeWaived
                ? "Waived"
                : formatEstimateCurrency(estimate.setupFeeApplied)
            }
          />
          {setupWaiverNote && (
            <p className="text-xs text-muted">{setupWaiverNote}</p>
          )}
        </div>
        <div className="border-t border-border pt-2">
          <EstimateLine
            label="Estimated total"
            value={formatEstimateCurrency(estimate.estimatedTotal)}
            emphasis
          />
          <EstimateLine
            label="Approx. per item"
            value={formatEstimateCurrency(estimate.estimatedPerItem)}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">{PRICE_ESTIMATE_DISCLAIMER}</p>
    </div>
  );
}
