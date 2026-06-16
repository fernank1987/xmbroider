export type DeleteQuoteRequestResult = {
  quoteRequestId: string;
  deletedFilesCount: number;
  warnings?: string[];
};

function getDeleteQuoteRequestErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  if (status === 401 || status === 403) {
    return "You are not authorized to delete quote requests.";
  }

  return "Unable to delete quote request.";
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
    throw new Error("Invalid delete quote response.");
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
