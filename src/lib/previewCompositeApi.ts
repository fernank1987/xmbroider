import type { PreviewCalibration } from "./previewCalibration";
import type { MockupImageSide } from "./productMockupImage";

export type RequestServerCompositePreviewInput = {
  siteId: string;
  turnstileToken: string;
  quoteRequestId: string;
  productImageUrl: string | null;
  mockupSide: MockupImageSide;
  fallbackSwatchColor?: string;
  baseCalibration: PreviewCalibration;
  logos: Array<{
    label: string;
    artworkUrl: string;
    placement: string;
    logoWidthMm: number;
    logoGarmentPositionX: number;
    logoGarmentPositionY: number;
    calibration: PreviewCalibration;
  }>;
};

export type RequestServerCompositePreviewResult = {
  previewImageUrl: string;
  previewImageStoragePath: string;
  previewCompositeUrl: string;
  previewCompositeStoragePath: string;
  usedProductPhoto: boolean;
  approximateFallback: boolean;
  exportNote: string | null;
};

function getCompositeErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.exportNote === "string" && record.exportNote.trim()) {
      return record.exportNote;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
  }

  if (status === 503) {
    return "Composite preview export is temporarily unavailable.";
  }

  return "Composite preview export failed.";
}

/** Requests server-side composite generation (avoids browser Storage CORS). */
export async function requestServerCompositePreview(
  input: RequestServerCompositePreviewInput,
): Promise<RequestServerCompositePreviewResult> {
  const response = await fetch("/api/preview-composite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(getCompositeErrorMessage(body, response.status));
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid composite preview response.");
  }

  const data = body as Record<string, unknown>;
  const previewCompositeUrl = typeof data.previewCompositeUrl === "string" ? data.previewCompositeUrl : null;
  const previewCompositeStoragePath =
    typeof data.previewCompositeStoragePath === "string"
      ? data.previewCompositeStoragePath
      : null;
  const previewImageUrl = typeof data.previewImageUrl === "string" ? data.previewImageUrl : previewCompositeUrl;
  const previewImageStoragePath =
    typeof data.previewImageStoragePath === "string"
      ? data.previewImageStoragePath
      : previewCompositeStoragePath;

  if (!previewCompositeUrl || !previewCompositeStoragePath || !previewImageUrl || !previewImageStoragePath) {
    throw new Error("Composite preview response is missing upload URLs.");
  }

  return {
    previewImageUrl,
    previewImageStoragePath,
    previewCompositeUrl,
    previewCompositeStoragePath,
    usedProductPhoto: data.usedProductPhoto === true,
    approximateFallback: data.approximateFallback === true,
    exportNote:
      typeof data.exportNote === "string" && data.exportNote.trim() ? data.exportNote : null,
  };
}
