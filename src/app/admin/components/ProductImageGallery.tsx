"use client";

import { useMemo, useState } from "react";
import type { SaveStatusApi } from "../lib/useSaveStatus";
import { adminBodyText, adminImageStage, adminLabel } from "../lib/adminStyles";
import SaveStatusMessage from "./SaveStatusMessage";

type ProductImageSide = "front" | "back";

type ProductImageGalleryProps = {
  colorName: string;
  frontImageUrl: string | null;
  frontImageStoragePath: string | null;
  backImageUrl: string | null;
  backImageStoragePath: string | null;
  disabled?: boolean;
  saveStatus: SaveStatusApi;
  frontUploadKey: string;
  backUploadKey: string;
  onUploadFront: (file: File) => void;
  onUploadBack: (file: File) => void;
};

const sideLabels: Record<ProductImageSide, string> = {
  front: "Front image",
  back: "Back image",
};

export default function ProductImageGallery({
  colorName,
  frontImageUrl,
  frontImageStoragePath,
  backImageUrl,
  backImageStoragePath,
  disabled = false,
  saveStatus,
  frontUploadKey,
  backUploadKey,
  onUploadFront,
  onUploadBack,
}: ProductImageGalleryProps) {
  const availableSides = useMemo(() => {
    const sides: ProductImageSide[] = [];
    if (frontImageUrl) {
      sides.push("front");
    }
    if (backImageUrl) {
      sides.push("back");
    }
    return sides;
  }, [frontImageUrl, backImageUrl]);

  const [requestedSide, setRequestedSide] = useState<ProductImageSide>("front");

  const activeSide = useMemo(() => {
    if (availableSides.length === 0) {
      return "front" as const;
    }
    if (availableSides.includes(requestedSide)) {
      return requestedSide;
    }
    return availableSides[0];
  }, [availableSides, requestedSide]);

  const activeImageUrl = activeSide === "front" ? frontImageUrl : backImageUrl;
  const activeStoragePath =
    activeSide === "front" ? frontImageStoragePath : backImageStoragePath;

  const frontEntry = saveStatus.getEntry(frontUploadKey);
  const backEntry = saveStatus.getEntry(backUploadKey);
  const frontBusy = frontEntry.status === "saving" || saveStatus.isSaving(frontUploadKey);
  const backBusy = backEntry.status === "saving" || saveStatus.isSaving(backUploadKey);

  return (
    <div className="w-full max-w-md space-y-2">
      {activeImageUrl ? (
        <div className="space-y-2">
          <div
            className={`${adminImageStage} mx-auto flex min-h-[160px] max-h-[280px] w-full max-w-[480px] items-center justify-center`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageUrl}
              alt={`${colorName} ${activeSide}`}
              className="max-h-[260px] max-w-full object-contain opacity-100 [mix-blend-mode:normal]"
            />
          </div>
          <div>
            <p className={`text-xs font-medium ${adminBodyText}`}>{sideLabels[activeSide]}</p>
            {activeStoragePath && (
              <p
                className="truncate text-[10px] text-slate-500 admin-dark:text-zinc-500"
                title={activeStoragePath}
              >
                {activeStoragePath}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`${adminImageStage} mx-auto flex min-h-[120px] w-full max-w-[480px] items-center justify-center text-xs text-slate-500 admin-dark:text-zinc-500`}
        >
          No image uploaded yet
        </div>
      )}

      {availableSides.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {availableSides.map((side) => (
            <button
              key={side}
              type="button"
              disabled={disabled || frontBusy || backBusy}
              onClick={() => setRequestedSide(side)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                activeSide === side
                  ? "border-amber-600 bg-amber-50 text-amber-900 admin-dark:border-amber-500 admin-dark:bg-amber-500/10 admin-dark:text-amber-200"
                  : "border-slate-300 text-slate-700 admin-dark:border-zinc-700 admin-dark:text-zinc-300"
              }`}
            >
              {side === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:gap-4">
        <div className="min-w-[140px] space-y-1">
          <label className={`text-sm ${adminLabel}`}>
            {frontImageUrl ? "Replace front image" : "Front image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={disabled || frontBusy}
              className="mt-1 block max-w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUploadFront(file);
                  setRequestedSide("front");
                }
                event.target.value = "";
              }}
            />
          </label>
          {frontEntry.status === "saving" && (
            <SaveStatusMessage status="saving" message="Uploading…" />
          )}
          {frontEntry.status === "saved" && (
            <SaveStatusMessage status="saved" message={frontEntry.message ?? "Uploaded"} />
          )}
          {frontEntry.status === "error" && frontEntry.message && (
            <SaveStatusMessage
              status="error"
              message={frontEntry.message}
              onDismiss={() => saveStatus.dismissError(frontUploadKey)}
            />
          )}
        </div>
        <div className="min-w-[140px] space-y-1">
          <label className={`text-sm ${adminLabel}`}>
            {backImageUrl ? "Replace back image" : "Back image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={disabled || backBusy}
              className="mt-1 block max-w-full text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUploadBack(file);
                  setRequestedSide("back");
                }
                event.target.value = "";
              }}
            />
          </label>
          {backEntry.status === "saving" && (
            <SaveStatusMessage status="saving" message="Uploading…" />
          )}
          {backEntry.status === "saved" && (
            <SaveStatusMessage status="saved" message={backEntry.message ?? "Uploaded"} />
          )}
          {backEntry.status === "error" && backEntry.message && (
            <SaveStatusMessage
              status="error"
              message={backEntry.message}
              onDismiss={() => saveStatus.dismissError(backUploadKey)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
