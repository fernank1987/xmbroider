"use client";

import {
  adminSaveError,
  adminSaveSaving,
  adminSaveSuccess,
} from "../lib/adminStyles";

type SaveStatusMessageProps = {
  status: "saving" | "saved" | "error";
  message?: string | null;
  onDismiss?: () => void;
};

export function SaveSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export default function SaveStatusMessage({
  status,
  message,
  onDismiss,
}: SaveStatusMessageProps) {
  if (status === "saving") {
    return (
      <p className={`flex items-center gap-1.5 ${adminSaveSaving}`} role="status">
        <SaveSpinner />
        <span>{message ?? "Saving…"}</span>
      </p>
    );
  }

  if (status === "saved") {
    return (
      <p className={adminSaveSuccess} role="status">
        {message ?? "Saved"}
      </p>
    );
  }

  return (
    <p className={`flex flex-wrap items-center gap-2 ${adminSaveError}`} role="alert">
      <span>{message ?? "Something went wrong. Try again."}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          Dismiss
        </button>
      )}
    </p>
  );
}
