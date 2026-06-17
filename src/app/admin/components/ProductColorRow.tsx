"use client";

import type { Product, ProductColor } from "@/lib/firebase/productRepository";
import {
  getColorCalibrationFormValues,
  getColorCalibrationSource,
  getColorCalibrationStatusLabel,
  type CalibrationFormValues,
} from "@/lib/productCalibrationAdmin";
import type { SaveStatusApi } from "../lib/useSaveStatus";
import { adminBodyText, adminInput, adminLabel } from "../lib/adminStyles";
import AdminSaveButton from "./AdminSaveButton";
import ProductImageGallery from "./ProductImageGallery";
import SaveStatusMessage from "./SaveStatusMessage";

type ProductColorRowProps = {
  product: Product;
  color: ProductColor;
  expanded: boolean;
  saveStatus: SaveStatusApi;
  onToggleExpand: () => void;
  onCollapse: () => void;
  onDelete: () => void;
  onUploadFront: (file: File) => void;
  onUploadBack: (file: File) => void;
  onCalibrationFieldChange: (
    field: keyof CalibrationFormValues,
    value: number,
  ) => void;
  onUseProductDefault: () => void;
  onCustomizeForColor: () => void;
  onVisualCalibrate: () => void;
  onColorDetailsChange: (
    field: "name" | "hex" | "sortOrder" | "isVisible",
    value: string | number | boolean,
  ) => void;
  onSaveColorDetails: () => void;
};

function ImageStatus({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span className="text-xs text-slate-600 admin-dark:text-zinc-400">
      {label} {ready ? "✅" : "—"}
    </span>
  );
}

function actionKey(productId: string, colorId: string, action: string): string {
  return `color:${productId}:${colorId}:${action}`;
}

export default function ProductColorRow({
  product,
  color,
  expanded,
  saveStatus,
  onToggleExpand,
  onCollapse,
  onDelete,
  onUploadFront,
  onUploadBack,
  onCalibrationFieldChange,
  onUseProductDefault,
  onCustomizeForColor,
  onVisualCalibrate,
  onColorDetailsChange,
  onSaveColorDetails,
}: ProductColorRowProps) {
  const calibrationSource = getColorCalibrationSource(product, color);
  const calibrationStatus = getColorCalibrationStatusLabel(product, color);
  const usingProductDefault = calibrationSource === "product-default";
  const usingCategoryDefault = calibrationSource === "category-default";
  const calibrationValues = getColorCalibrationFormValues(product, color);

  const detailsKey = actionKey(product.id, color.id, "details");
  const deleteKey = actionKey(product.id, color.id, "delete");
  const frontUploadKey = actionKey(product.id, color.id, "frontUpload");
  const backUploadKey = actionKey(product.id, color.id, "backUpload");
  const useDefaultKey = actionKey(product.id, color.id, "useDefault");
  const customizeKey = actionKey(product.id, color.id, "customize");

  const colorBusy =
    saveStatus.isSaving(detailsKey) ||
    saveStatus.isSaving(deleteKey) ||
    saveStatus.isSaving(frontUploadKey) ||
    saveStatus.isSaving(backUploadKey) ||
    saveStatus.isSaving(useDefaultKey);

  const customizeEntry = saveStatus.getEntry(customizeKey);

  return (
    <div className="rounded-lg border border-slate-200 bg-white admin-dark:border-zinc-700 admin-dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-slate-300 admin-dark:border-zinc-600"
          style={{ backgroundColor: color.hex ?? "#cbd5e1" }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 admin-dark:text-white">
            {color.name}
            {!color.isVisible && (
              <span className="ml-2 text-xs font-normal text-slate-500 admin-dark:text-zinc-500">
                (hidden)
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <ImageStatus label="Front" ready={Boolean(color.frontImageUrl)} />
            <ImageStatus label="Back" ready={Boolean(color.backImageUrl)} />
            {!color.frontImageUrl ? (
              <span className="text-xs text-amber-700 admin-dark:text-amber-400">
                This color has no front image uploaded.
              </span>
            ) : null}
            <span className="text-xs text-slate-500 admin-dark:text-zinc-500">
              {calibrationStatus}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={colorBusy}
              onClick={onToggleExpand}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
            >
              {expanded ? "Editing" : "Edit"}
            </button>
            <AdminSaveButton
              actionKey={deleteKey}
              saveStatus={saveStatus}
              idleLabel="Delete"
              savingLabel="Deleting…"
              savedLabel="Deleted"
              variant="danger"
              size="xs"
              onClick={onDelete}
              disabled={colorBusy && !saveStatus.isSaving(deleteKey)}
            />
          </div>
          {saveStatus.getEntry(deleteKey).status === "error" &&
            saveStatus.getEntry(deleteKey).message && (
              <SaveStatusMessage
                status="error"
                message={saveStatus.getEntry(deleteKey).message}
                onDismiss={() => saveStatus.dismissError(deleteKey)}
              />
            )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 px-3 py-3 admin-dark:border-zinc-700">
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3 admin-dark:border-zinc-700 admin-dark:bg-zinc-900/50">
            <p className={`text-xs font-semibold uppercase tracking-wide ${adminBodyText}`}>
              Color details
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className={adminLabel}>Color name</label>
                <input
                  className={adminInput}
                  value={color.name}
                  disabled={saveStatus.isSaving(detailsKey)}
                  onChange={(event) => onColorDetailsChange("name", event.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel}>Hex (optional)</label>
                <input
                  className={adminInput}
                  value={color.hex ?? ""}
                  placeholder="#1B2A4A"
                  disabled={saveStatus.isSaving(detailsKey)}
                  onChange={(event) => onColorDetailsChange("hex", event.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel}>Sort order</label>
                <input
                  className={adminInput}
                  type="number"
                  step="1"
                  value={color.sortOrder}
                  disabled={saveStatus.isSaving(detailsKey)}
                  onChange={(event) =>
                    onColorDetailsChange("sortOrder", Number(event.target.value))
                  }
                />
              </div>
              <label className="flex items-center gap-2 pt-6 text-sm text-slate-700 admin-dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={color.isVisible}
                  disabled={saveStatus.isSaving(detailsKey)}
                  onChange={(event) => onColorDetailsChange("isVisible", event.target.checked)}
                />
                Visible on catalog and preview
              </label>
            </div>
            <AdminSaveButton
              actionKey={detailsKey}
              saveStatus={saveStatus}
              idleLabel="Save color details"
              savingLabel="Saving…"
              savedLabel={`Saved ${color.name}`}
              variant="primary"
              size="xs"
              className="mt-3"
              onClick={onSaveColorDetails}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ProductImageGallery
              colorName={color.name}
              frontImageUrl={color.frontImageUrl}
              frontImageStoragePath={color.frontImageStoragePath}
              backImageUrl={color.backImageUrl}
              backImageStoragePath={color.backImageStoragePath}
              disabled={colorBusy}
              saveStatus={saveStatus}
              frontUploadKey={frontUploadKey}
              backUploadKey={backUploadKey}
              onUploadFront={onUploadFront}
              onUploadBack={onUploadBack}
            />

            <div>
              <p className={`text-xs ${adminBodyText}`}>
                {calibrationSource === "custom-color"
                  ? "Using custom calibration for this color."
                  : usingProductDefault
                    ? "Using product default calibration."
                    : "Using category default calibration."}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={adminLabel}>Garment X %</label>
                  <input
                    className={adminInput}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={calibrationValues.xPercent}
                    disabled={usingProductDefault || usingCategoryDefault}
                    onChange={(event) =>
                      onCalibrationFieldChange("xPercent", Number(event.target.value))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabel}>Garment Y %</label>
                  <input
                    className={adminInput}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={calibrationValues.yPercent}
                    disabled={usingProductDefault || usingCategoryDefault}
                    onChange={(event) =>
                      onCalibrationFieldChange("yPercent", Number(event.target.value))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabel}>Garment Width %</label>
                  <input
                    className={adminInput}
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={calibrationValues.widthPercent}
                    disabled={usingProductDefault || usingCategoryDefault}
                    onChange={(event) =>
                      onCalibrationFieldChange("widthPercent", Number(event.target.value))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabel}>Garment Height %</label>
                  <input
                    className={adminInput}
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={calibrationValues.heightPercent}
                    disabled={usingProductDefault || usingCategoryDefault}
                    onChange={(event) =>
                      onCalibrationFieldChange("heightPercent", Number(event.target.value))
                    }
                  />
                </div>
                <div>
                  <label className={adminLabel}>Physical width mm</label>
                  <input
                    className={adminInput}
                    type="number"
                    min="1"
                    step="1"
                    value={calibrationValues.physicalWidthMm}
                    disabled={usingProductDefault || usingCategoryDefault}
                    onChange={(event) =>
                      onCalibrationFieldChange("physicalWidthMm", Number(event.target.value))
                    }
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-start gap-2">
                <button
                  type="button"
                  disabled={!color.frontImageUrl || colorBusy}
                  onClick={onVisualCalibrate}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 admin-dark:border-amber-500/40 admin-dark:text-amber-300"
                >
                  Calibrate visually
                </button>
                <AdminSaveButton
                  actionKey={useDefaultKey}
                  saveStatus={saveStatus}
                  idleLabel="Use product default"
                  savingLabel="Saving…"
                  savedLabel="Using product default"
                  variant="outline"
                  size="xs"
                  onClick={onUseProductDefault}
                  disabled={calibrationSource === "product-default" || colorBusy}
                />
                <div className="inline-flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={colorBusy}
                    onClick={onCustomizeForColor}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
                  >
                    Customize for this color
                  </button>
                  {customizeEntry.status === "saved" && customizeEntry.message && (
                    <SaveStatusMessage status="saved" message={customizeEntry.message} />
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCollapse}
            className="mt-4 text-xs font-medium text-amber-700 admin-dark:text-amber-400"
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  );
}
