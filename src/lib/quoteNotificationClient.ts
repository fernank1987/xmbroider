import type { QuoteNotificationPayload } from "./email/quoteNotificationTypes";
import type { QuoteRequest } from "./firebase/quoteRepository";

export function buildQuoteNotificationPayload(
  siteId: string,
  quote: QuoteRequest,
): QuoteNotificationPayload {
  return {
    quoteId: quote.id,
    siteId,
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    serviceNeeded: quote.serviceNeeded,
    quantity: quote.quantity,
    deadline: quote.deadline,
    projectDetails: quote.projectDetails,
    source: quote.source,
    productName: quote.productName,
    productBrand: quote.productBrand,
    productMaterial: quote.productMaterial,
    colorName: quote.colorName,
    size: quote.size,
    placement: quote.placement,
    decorationMethod: quote.decorationMethod,
    logoWidthMm: quote.logoWidthMm,
    logoWidthInches: quote.logoWidthInches,
    sizePresetLabel: quote.sizePresetLabel,
    artworkUrl: quote.artworkUrl,
    previewImageUrl: quote.previewImageUrl,
    productImageUrl: quote.productImageUrl,
  };
}

/**
 * Notifies admin by email after a quote is saved. Never throws — quote submission
 * success must not depend on email delivery.
 */
export async function notifyQuoteRequestCreated(
  payload: QuoteNotificationPayload,
): Promise<void> {
  try {
    const response = await fetch("/api/quote-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok && process.env.NODE_ENV === "development") {
      const text = await response.text().catch(() => "");
      console.warn("[quote-notification] request failed:", response.status, text);
      return;
    }

    const result = (await response.json()) as { notificationStatus?: string; warning?: string };
    if (process.env.NODE_ENV === "development") {
      if (result.warning) {
        console.warn("[quote-notification]", result.warning);
      } else {
        console.log("[quote-notification] status:", result.notificationStatus);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[quote-notification] request error:", error);
    }
  }
}
