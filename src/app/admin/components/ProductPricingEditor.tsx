"use client";

import {
  ESTIMATOR_COMPLEXITIES,
  ESTIMATOR_COMPLEXITY_LABELS,
  ESTIMATOR_PLACEMENTS,
  ESTIMATOR_PLACEMENT_LABELS,
} from "@/lib/pricing/estimatorConstants";
import {
  cloneProductPricing,
  ST550_DEFAULT_PRICING,
  type ProductPricing,
  type ProductQuantityBreak,
} from "@/lib/pricing/productPricing";
import {
  adminBodyText,
  adminInput,
  adminLabel,
} from "../lib/adminStyles";

type ProductPricingEditorProps = {
  pricing: ProductPricing | null;
  onChange: (pricing: ProductPricing | null) => void;
  onApplySt550Defaults: () => void;
};

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.floor(parsed);
}

function parseRequiredNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createEmptyBreak(): ProductQuantityBreak {
  return {
    minQty: 1,
    maxQty: null,
    blankUnitPrice: 0,
    decorationBasePrice: 0,
  };
}

export default function ProductPricingEditor({
  pricing,
  onChange,
  onApplySt550Defaults,
}: ProductPricingEditorProps) {
  const enabled = pricing?.enabled ?? false;

  const setPricing = (next: ProductPricing) => {
    onChange(next);
  };

  const handleEnableChange = (checked: boolean) => {
    if (checked) {
      onChange(cloneProductPricing(pricing ?? ST550_DEFAULT_PRICING));
      return;
    }
    if (pricing) {
      onChange({ ...pricing, enabled: false });
      return;
    }
    onChange(null);
  };

  if (!pricing) {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-800 admin-dark:text-zinc-200">
          <input
            type="checkbox"
            checked={false}
            onChange={(event) => handleEnableChange(event.target.checked)}
            className="rounded border-slate-300"
          />
          Enable estimator pricing
        </label>
        <p className={`text-xs ${adminBodyText}`}>
          When disabled, the preview page uses ST550 default pricing for this product.
        </p>
      </div>
    );
  }

  const updateBreak = (
    index: number,
    field: keyof ProductQuantityBreak,
    value: string,
  ) => {
    setPricing({
      ...pricing,
      quantityBreaks: pricing.quantityBreaks.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        if (field === "minQty") {
          return { ...entry, minQty: Math.max(1, parseOptionalInt(value) ?? 1) };
        }
        if (field === "maxQty") {
          return { ...entry, maxQty: parseOptionalInt(value) };
        }
        if (field === "blankUnitPrice") {
          return { ...entry, blankUnitPrice: parseRequiredNumber(value) };
        }
        return { ...entry, decorationBasePrice: parseRequiredNumber(value) };
      }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-900 admin-dark:text-white">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleEnableChange(event.target.checked)}
            className="rounded border-slate-300"
          />
          Enable estimator pricing
        </label>
        <button
          type="button"
          onClick={onApplySt550Defaults}
          className="text-xs font-medium text-amber-700 admin-dark:text-amber-400"
        >
          Apply ST550 pricing defaults
        </button>
      </div>

      {!enabled && (
        <p className={`text-xs ${adminBodyText}`}>
          Pricing is saved but disabled — preview will use ST550 fallback until enabled.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={adminLabel}>Cost basis</label>
          <input
            className={adminInput}
            type="number"
            min={0}
            step="0.01"
            value={pricing.costBasis}
            onChange={(event) =>
              setPricing({ ...pricing, costBasis: parseRequiredNumber(event.target.value) })
            }
          />
        </div>
        <div>
          <label className={adminLabel}>Deal cost</label>
          <input
            className={adminInput}
            type="number"
            min={0}
            step="0.01"
            value={pricing.dealCost ?? ""}
            placeholder="Optional"
            onChange={(event) =>
              setPricing({
                ...pricing,
                dealCost: event.target.value.trim()
                  ? parseRequiredNumber(event.target.value)
                  : undefined,
              })
            }
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm text-slate-800 admin-dark:text-zinc-200">
            <input
              type="checkbox"
              checked={pricing.useDealCostForMargin ?? false}
              onChange={(event) =>
                setPricing({ ...pricing, useDealCostForMargin: event.target.checked })
              }
              className="rounded border-slate-300"
            />
            Use deal cost for margin
          </label>
        </div>
        <div>
          <label className={adminLabel}>Setup fee</label>
          <input
            className={adminInput}
            type="number"
            min={0}
            step="0.01"
            value={pricing.setupFee}
            onChange={(event) =>
              setPricing({ ...pricing, setupFee: parseRequiredNumber(event.target.value) })
            }
          />
        </div>
        <div>
          <label className={adminLabel}>Waive setup fee at quantity</label>
          <input
            className={adminInput}
            type="number"
            min={1}
            step={1}
            value={pricing.setupFeeWaivedAtQty ?? ""}
            placeholder="Never waive"
            onChange={(event) =>
              setPricing({
                ...pricing,
                setupFeeWaivedAtQty: parseOptionalInt(event.target.value),
              })
            }
          />
        </div>
        <div>
          <label className={adminLabel}>Setup fee label</label>
          <input
            className={adminInput}
            value={pricing.setupFeeLabel}
            onChange={(event) =>
              setPricing({ ...pricing, setupFeeLabel: event.target.value })
            }
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 admin-dark:text-white">
            Quantity breaks
          </p>
          <button
            type="button"
            onClick={() =>
              setPricing({
                ...pricing,
                quantityBreaks: [...pricing.quantityBreaks, createEmptyBreak()],
              })
            }
            className="text-xs font-medium text-slate-700 admin-dark:text-zinc-300"
          >
            Add break
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500 admin-dark:text-zinc-500">
                <th className="px-2 py-1">Min qty</th>
                <th className="px-2 py-1">Max qty</th>
                <th className="px-2 py-1">Blank unit</th>
                <th className="px-2 py-1">Embroidery base</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {pricing.quantityBreaks.map((entry, index) => (
                <tr key={`break-${index}`}>
                  <td className="px-2 py-1">
                    <input
                      className={adminInput}
                      type="number"
                      min={1}
                      step={1}
                      value={entry.minQty}
                      onChange={(event) => updateBreak(index, "minQty", event.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className={adminInput}
                      type="number"
                      min={1}
                      step={1}
                      value={entry.maxQty ?? ""}
                      placeholder="No max"
                      onChange={(event) => updateBreak(index, "maxQty", event.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className={adminInput}
                      type="number"
                      min={0}
                      step="0.01"
                      value={entry.blankUnitPrice}
                      onChange={(event) =>
                        updateBreak(index, "blankUnitPrice", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className={adminInput}
                      type="number"
                      min={0}
                      step="0.01"
                      value={entry.decorationBasePrice}
                      onChange={(event) =>
                        updateBreak(index, "decorationBasePrice", event.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      disabled={pricing.quantityBreaks.length <= 1}
                      onClick={() =>
                        setPricing({
                          ...pricing,
                          quantityBreaks: pricing.quantityBreaks.filter(
                            (_, entryIndex) => entryIndex !== index,
                          ),
                        })
                      }
                      className="text-xs text-red-700 disabled:opacity-40 admin-dark:text-red-400"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-900 admin-dark:text-white">
            Placement multipliers
          </p>
          <div className="space-y-2">
            {ESTIMATOR_PLACEMENTS.map((key) => (
              <div key={key} className="grid grid-cols-[1fr_96px] items-center gap-2">
                <span className="text-sm text-slate-700 admin-dark:text-zinc-300">
                  {ESTIMATOR_PLACEMENT_LABELS[key]}
                </span>
                <input
                  className={adminInput}
                  type="number"
                  min={0}
                  step="0.01"
                  value={pricing.placementMultipliers[key]}
                  onChange={(event) =>
                    setPricing({
                      ...pricing,
                      placementMultipliers: {
                        ...pricing.placementMultipliers,
                        [key]: parseRequiredNumber(event.target.value, 1),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-900 admin-dark:text-white">
            Complexity multipliers
          </p>
          <div className="space-y-2">
            {ESTIMATOR_COMPLEXITIES.map((key) => (
              <div key={key} className="grid grid-cols-[1fr_96px] items-center gap-2">
                <span className="text-sm text-slate-700 admin-dark:text-zinc-300">
                  {ESTIMATOR_COMPLEXITY_LABELS[key]}
                </span>
                <input
                  className={adminInput}
                  type="number"
                  min={0}
                  step="0.01"
                  value={pricing.complexityMultipliers[key]}
                  onChange={(event) =>
                    setPricing({
                      ...pricing,
                      complexityMultipliers: {
                        ...pricing.complexityMultipliers,
                        [key]: parseRequiredNumber(event.target.value, 1),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
