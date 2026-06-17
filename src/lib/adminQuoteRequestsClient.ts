export type DeleteQuoteRequestResult = {
  quoteRequestId: string;
  deletedFilesCount: number;
  warnings?: string[];
};

function sanitizeDeleteErrorDetail(detail: string): string {
  const normalized = detail.trim();
  if (!normalized) {
    return "Unable to delete quote request.";
  }

  if (
    normalized.includes("ERR_REQUIRE_ESM") ||
    normalized.includes("jwks-rsa") ||
    normalized.includes("firebase-admin/auth") ||
    normalized.includes("jose/dist/")
  ) {
    return "Token verification failed.";
  }

  return normalized;
}

function getDeleteQuoteRequestErrorMessage(body: unknown, status: number): string {
  let detail = "Unable to delete quote request.";
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      detail = sanitizeDeleteErrorDetail(error);
    }
  }

  if (status === 401) {
    return `Delete failed: ${detail}`;
  }

  if (status === 403) {
    if (detail.toLowerCase().includes("allowlist")) {
      return `Delete failed: ${detail}`;
    }
    return "Delete failed: you do not have admin access.";
  }

  if (status >= 500) {
    if (
      detail.toLowerCase().includes("storage") ||
      detail.toLowerCase().includes("admin delete is not configured")
    ) {
      return "Delete failed: storage cleanup failed.";
    }
    return "Delete failed: quote request could not be deleted.";
  }

  return `Delete failed: ${detail}`;
}

/** Deletes a quote request and its uploaded files via the admin API. */
export async function deleteQuoteRequest(options: {
  quoteRequestId: string;
  idToken: string;
}): Promise<DeleteQuoteRequestResult> {
  const response = await fetch(
    `/api/admin/quote-requests/${encodeURIComponent(options.quoteRequestId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${options.idToken}`,
      },
    },
  );

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(getDeleteQuoteRequestErrorMessage(body, response.status));
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("Delete failed: invalid server response.");
  }

  const data = body as Record<string, unknown>;
  const quoteRequestId =
    typeof data.quoteRequestId === "string" ? data.quoteRequestId : options.quoteRequestId;
  const deletedFilesCount =
    typeof data.deletedFilesCount === "number" ? data.deletedFilesCount : 0;
  const warnings = Array.isArray(data.warnings)
    ? data.warnings.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  return {
    quoteRequestId,
    deletedFilesCount,
    warnings,
  };
}
