import { sendQuoteNotificationEmails } from "@/lib/email/sendQuoteNotification";
import type { QuoteNotificationPayload } from "@/lib/email/quoteNotificationTypes";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function persistQuoteNotificationStatus(
  siteId: string,
  quoteId: string,
  status: "sent" | "failed" | "not_configured",
  errorSummary?: string,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) {
    return;
  }

  const update: Record<string, unknown> = {
    notificationStatus: status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === "sent") {
    update.notificationSentAt = FieldValue.serverTimestamp();
    update.notificationErrorSummary = null;
  } else if (status === "failed" || status === "not_configured") {
    update.notificationErrorSummary = errorSummary ?? null;
  }

  await db
    .collection("sites")
    .doc(siteId)
    .collection("quoteRequests")
    .doc(quoteId)
    .set(update, { merge: true });
}

/** Sends quote notification emails and persists status. Never throws. */
export async function sendQuoteNotificationForPayload(
  payload: QuoteNotificationPayload,
): Promise<void> {
  try {
    const result = await sendQuoteNotificationEmails(payload);

    try {
      await persistQuoteNotificationStatus(
        payload.siteId,
        payload.quoteId,
        result.notificationStatus,
        result.errorSummary,
      );
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[quote-notification] Failed to persist notification status:", error);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[quote-notification]", {
        quoteId: payload.quoteId,
        status: result.notificationStatus,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[quote-notification] send failed:", {
        quoteId: payload.quoteId,
        error,
      });
    }
  }
}
