import type { CreateQuoteRequestInput } from "@/lib/firebase/quoteRepository";
import { TURNSTILE_DEV_BYPASS_TOKEN } from "@/lib/turnstile";

export const TURNSTILE_MISSING_CHECK_MESSAGE =
  "Please complete the anti-spam check before submitting.";

export const TURNSTILE_EXPIRED_MESSAGE =
  "The anti-spam check expired. Please try again.";

export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined;
}

export function isTurnstileSiteKeyConfigured(): boolean {
  return Boolean(getTurnstileSiteKey());
}

/** True when local dev can submit without Turnstile keys. */
export function isTurnstileDevBypassActive(): boolean {
  return process.env.NODE_ENV === "development" && !isTurnstileSiteKeyConfigured();
}

export function getInitialTurnstileToken(): string | null {
  return isTurnstileDevBypassActive() ? TURNSTILE_DEV_BYPASS_TOKEN : null;
}

export function isTurnstileSubmitReady(token: string | null): boolean {
  return Boolean(token?.trim());
}

export function getTurnstileStatusText(options: {
  token: string | null;
  expired: boolean;
  devBypass: boolean;
}): string {
  if (options.devBypass) {
    return "Verified. You can submit now.";
  }
  if (options.expired) {
    return "Verification expired. Please verify again.";
  }
  if (isTurnstileSubmitReady(options.token)) {
    return "Verified. You can submit now.";
  }
  return "Complete the anti-spam check to submit.";
}

export function isQuoteSubmissionAvailable(): boolean {
  if (process.env.NODE_ENV === "production") {
    return isTurnstileSiteKeyConfigured();
  }
  return isTurnstileSiteKeyConfigured() || isTurnstileDevBypassActive();
}

export type SubmitQuoteRequestBody = {
  siteId: string;
  turnstileToken: string;
  quoteRequestId?: string;
  quote: CreateQuoteRequestInput;
};

export type SubmitQuoteRequestResult = {
  quoteId: string;
};

function getSubmitQuoteRequestErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  if (status === 403) {
    return TURNSTILE_EXPIRED_MESSAGE;
  }

  return "Unable to submit your quote request. Please try again.";
}

/** Submits a quote through the server API after Turnstile verification. */
export async function submitQuoteRequest(
  body: SubmitQuoteRequestBody,
): Promise<SubmitQuoteRequestResult> {
  const response = await fetch("/api/quote-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let result: unknown = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(getSubmitQuoteRequestErrorMessage(result, response.status));
  }

  const quoteId =
    typeof result === "object" &&
    result !== null &&
    "quoteId" in result &&
    typeof (result as { quoteId: unknown }).quoteId === "string"
      ? (result as { quoteId: string }).quoteId
      : null;

  if (!quoteId) {
    throw new Error("Quote request was accepted but no quote id was returned.");
  }

  return { quoteId };
}
