"use client";

import type { SaveStatusApi } from "../lib/useSaveStatus";
import {
  adminButtonDisabled,
  adminButtonOutlineDisabled,
  adminButtonSmallDisabled,
} from "../lib/adminStyles";
import SaveStatusMessage, { SaveSpinner } from "./SaveStatusMessage";

type AdminSaveButtonVariant = "primary" | "outline" | "danger" | "amber-outline";
type AdminSaveButtonSize = "xs" | "sm" | "md";

type AdminSaveButtonProps = {
  actionKey: string;
  saveStatus: SaveStatusApi;
  idleLabel: string;
  savingLabel?: string;
  savedLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: AdminSaveButtonVariant;
  size?: AdminSaveButtonSize;
  className?: string;
  showInlineStatus?: boolean;
};

const variantClasses: Record<AdminSaveButtonVariant, string> = {
  primary:
    "rounded-lg bg-amber-700 font-semibold text-white hover:bg-amber-800 admin-dark:bg-amber-600 admin-dark:hover:bg-amber-500",
  outline:
    "rounded-lg border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 admin-dark:border-zinc-700 admin-dark:text-zinc-300 admin-dark:hover:bg-zinc-800",
  danger:
    "rounded-lg border border-red-300 font-semibold text-red-700 hover:bg-red-50 admin-dark:border-red-500/40 admin-dark:text-red-300 admin-dark:hover:bg-red-500/10",
  "amber-outline":
    "rounded-lg border border-amber-300 font-semibold text-amber-800 admin-dark:border-amber-500/40 admin-dark:text-amber-300",
};

const sizeClasses: Record<AdminSaveButtonSize, string> = {
  xs: "px-3 py-1.5 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
};

const disabledClasses: Record<AdminSaveButtonSize, string> = {
  xs: adminButtonSmallDisabled,
  sm: adminButtonOutlineDisabled,
  md: adminButtonDisabled,
};

export default function AdminSaveButton({
  actionKey,
  saveStatus,
  idleLabel,
  savingLabel,
  savedLabel,
  onClick,
  disabled = false,
  variant = "primary",
  size = "sm",
  className = "",
  showInlineStatus = true,
}: AdminSaveButtonProps) {
  const entry = saveStatus.getEntry(actionKey);
  const isSaving = entry.status === "saving";
  const isDisabled = disabled || isSaving;

  let buttonLabel = idleLabel;
  if (entry.status === "saving") {
    buttonLabel = savingLabel ?? "Saving…";
  } else if (entry.status === "saved") {
    buttonLabel = savedLabel ?? entry.message ?? "Saved";
  } else if (entry.status === "error") {
    buttonLabel = "Try again";
  }

  const buttonClass = isDisabled
    ? disabledClasses[size]
    : `${variantClasses[variant]} ${sizeClasses[size]} transition-colors`;

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={onClick}
        className={`inline-flex items-center gap-2 ${buttonClass}`}
      >
        {isSaving && <SaveSpinner />}
        {buttonLabel}
      </button>
      {showInlineStatus && entry.status === "error" && entry.message && (
        <SaveStatusMessage
          status="error"
          message={entry.message}
          onDismiss={() => saveStatus.dismissError(actionKey)}
        />
      )}
    </div>
  );
}
