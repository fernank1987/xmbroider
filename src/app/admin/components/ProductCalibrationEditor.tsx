"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calibrationBoundsToPercents,
  clampGarmentBounds,
  getContainedImageRect,
  getDefaultCalibrationForCategory,
  MIN_GARMENT_BOUND_SIZE,
  type GarmentBounds,
  type PreviewCalibration,
} from "@/lib/previewCalibration";
import { adminBodyText, adminInput, adminLabel, adminModal } from "../lib/adminStyles";
import type { SaveStatusApi } from "../lib/useSaveStatus";
import AdminSaveButton from "./AdminSaveButton";

type ProductCalibrationEditorProps = {
  open: boolean;
  imageUrl: string;
  colorName: string;
  productCategory: string;
  initialCalibration: PreviewCalibration | null;
  saveActionKey: string;
  saveStatus: SaveStatusApi;
  onSave: (calibration: PreviewCalibration) => Promise<void>;
  onCancel: () => void;
};

type DragStart = {
  pointerX: number;
  pointerY: number;
  bounds: GarmentBounds;
};

function formatPercent(value: number): string {
  return value.toFixed(1);
}

export default function ProductCalibrationEditor({
  open,
  imageUrl,
  colorName,
  productCategory,
  initialCalibration,
  saveActionKey,
  saveStatus,
  onSave,
  onCancel,
}: ProductCalibrationEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const defaultCalibration = getDefaultCalibrationForCategory(productCategory);
  const source = initialCalibration ?? defaultCalibration;
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageAspect, setImageAspect] = useState(1);
  const [bounds, setBounds] = useState<GarmentBounds>(() => source.garmentBounds);
  const [physicalWidthMm, setPhysicalWidthMm] = useState(() => source.physicalWidthMm);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      setContainerSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, imageUrl]);

  const imageRect = useMemo(
    () =>
      getContainedImageRect(containerSize.width, containerSize.height, imageAspect),
    [containerSize, imageAspect],
  );

  const percents = useMemo(() => calibrationBoundsToPercents(bounds), [bounds]);

  const boxStyle = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return null;
    }

    return {
      left: imageRect.x + bounds.x * imageRect.width,
      top: imageRect.y + bounds.y * imageRect.height,
      width: bounds.width * imageRect.width,
      height: bounds.height * imageRect.height,
    };
  }, [bounds, containerSize, imageRect]);

  const updateBounds = (next: GarmentBounds) => {
    setBounds(clampGarmentBounds(next));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      bounds: { ...bounds },
    };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current || imageRect.width <= 0 || imageRect.height <= 0) {
      return;
    }

    const deltaX = event.clientX - dragStartRef.current.pointerX;
    const deltaY = event.clientY - dragStartRef.current.pointerY;
    updateBounds({
      ...dragStartRef.current.bounds,
      x: dragStartRef.current.bounds.x + deltaX / imageRect.width,
      y: dragStartRef.current.bounds.y + deltaY / imageRect.height,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setDragging(false);
  };

  const handleReset = () => {
    const defaultCalibration = getDefaultCalibrationForCategory(productCategory);
    setBounds(defaultCalibration.garmentBounds);
    setPhysicalWidthMm(defaultCalibration.physicalWidthMm);
  };

  const handleSave = async () => {
    await onSave({
      garmentBounds: clampGarmentBounds(bounds),
      physicalWidthMm,
    });
  };

  const saving = saveStatus.isSaving(saveActionKey);

  if (!open) {
    return null;
  }

  const maxWidthPercent = (1 - bounds.x) * 100;
  const maxHeightPercent = (1 - bounds.y) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-editor-title"
    >
      <div className={adminModal}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              id="calibration-editor-title"
              className="text-lg font-semibold text-slate-900 admin-dark:text-white"
            >
              Calibrate {colorName}
            </h3>
            <p className={`mt-1 text-sm ${adminBodyText}`}>
              Fit the box around the real garment area only. Do not include the model&apos;s head,
              arms, pants, or extra background.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 admin-dark:border-zinc-600 admin-dark:text-zinc-200"
          >
            Close
          </button>
        </div>

        <div
          ref={containerRef}
          className={`relative mt-4 aspect-[4/3] isolate overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] [color-scheme:light] admin-dark:border-zinc-600`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${colorName} calibration reference`}
            className="h-full w-full object-contain opacity-100 [mix-blend-mode:normal]"
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                setImageAspect(image.naturalWidth / image.naturalHeight);
              }
            }}
          />

          {boxStyle && (
            <div
              role="presentation"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`absolute touch-none border-2 border-amber-500 bg-amber-400/20 ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{
                left: boxStyle.left,
                top: boxStyle.top,
                width: boxStyle.width,
                height: boxStyle.height,
              }}
            >
              <span className="pointer-events-none absolute -top-6 left-0 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Garment area
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div>
            <p className={adminLabel}>X %</p>
            <p className="text-sm font-medium text-slate-900 admin-dark:text-white">
              {formatPercent(percents.xPercent)}
            </p>
          </div>
          <div>
            <p className={adminLabel}>Y %</p>
            <p className="text-sm font-medium text-slate-900 admin-dark:text-white">
              {formatPercent(percents.yPercent)}
            </p>
          </div>
          <div>
            <p className={adminLabel}>Width %</p>
            <p className="text-sm font-medium text-slate-900 admin-dark:text-white">
              {formatPercent(percents.widthPercent)}
            </p>
          </div>
          <div>
            <p className={adminLabel}>Height %</p>
            <p className="text-sm font-medium text-slate-900 admin-dark:text-white">
              {formatPercent(percents.heightPercent)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="calibration-width" className={adminLabel}>
              Width ({formatPercent(percents.widthPercent)}%)
            </label>
            <input
              id="calibration-width"
              type="range"
              min={MIN_GARMENT_BOUND_SIZE * 100}
              max={Math.max(MIN_GARMENT_BOUND_SIZE * 100, maxWidthPercent)}
              step={0.1}
              value={percents.widthPercent}
              disabled={saving}
              onChange={(event) =>
                updateBounds({
                  ...bounds,
                  width: Number(event.target.value) / 100,
                })
              }
              className="mt-2 w-full accent-amber-600"
            />
          </div>
          <div>
            <label htmlFor="calibration-height" className={adminLabel}>
              Height ({formatPercent(percents.heightPercent)}%)
            </label>
            <input
              id="calibration-height"
              type="range"
              min={MIN_GARMENT_BOUND_SIZE * 100}
              max={Math.max(MIN_GARMENT_BOUND_SIZE * 100, maxHeightPercent)}
              step={0.1}
              value={percents.heightPercent}
              disabled={saving}
              onChange={(event) =>
                updateBounds({
                  ...bounds,
                  height: Number(event.target.value) / 100,
                })
              }
              className="mt-2 w-full accent-amber-600"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="calibration-physical-width" className={adminLabel}>
            Physical width mm
          </label>
          <input
            id="calibration-physical-width"
            type="number"
            min={1}
            step={1}
            value={physicalWidthMm}
            disabled={saving}
            onChange={(event) => setPhysicalWidthMm(Number(event.target.value))}
            className={adminInput}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-start gap-3">
          <AdminSaveButton
            actionKey={saveActionKey}
            saveStatus={saveStatus}
            idleLabel="Save calibration"
            savingLabel="Saving…"
            savedLabel="Saved"
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
          />
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 admin-dark:border-zinc-600 admin-dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 admin-dark:border-zinc-600 admin-dark:text-zinc-200"
          >
            Reset to default
          </button>
        </div>
      </div>
    </div>
  );
}
