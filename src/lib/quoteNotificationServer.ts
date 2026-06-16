import { sendQuoteNotificationEmails } from "@/lib/email/sendQuoteNotification";
import type { QuoteNotificationPayload } from "@/lib/email/quoteNotificationTypes";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function getResendEnvDiagnostics() {
  const quoteFromEmail = process.env.QUOTE_FROM_EMAIL?.trim() || null;
  const quoteNotificationEmail = process.env.QUOTE_NOTIFICATION_EMAIL?.trim() || null;

  return {
    hasResendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasQuoteNotificationEmail: Boolean(quoteNotificationEmail),
    hasQuoteFromEmail: Boolean(quoteFromEmail),
    quoteFromEmail: quoteFromEmail ?? "(missing)",
    quoteNotificationEmail: quoteNotificationEmail ? "(set)" : "(missing)",
  };
}

function logQuoteNotificationEvent(details: Record<string, unknown>): void {
  console.log("[quote-notification]", details);
}

export async function persistQuoteNotificationStatus(
  siteId: string,
  quoteId: string,
  status: "sent" | "failed" | "not_configured",
  errorSummary?: string,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error("Firebase Admin is not configured.");
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
  const envDiagnostics = getResendEnvDiagnostics();

  logQuoteNotificationEvent({
    phase: "start",
    quoteId: payload.quoteId,
    ...envDiagnostics,
  });

  try {
    const result = await sendQuoteNotificationEmails(payload);

    try {
      await persistQuoteNotificationStatus(
        payload.siteId,
        payload.quoteId,
        result.notificationStatus,
        result.errorSummary,
      );
    } catch (persistError) {
      logQuoteNotificationEvent({
        phase: "persist_failed",
        quoteId: payload.quoteId,
        notificationStatus: result.notificationStatus,
        error: getErrorMessage(persistError, "Failed to persist notification status."),
      });
    }

    logQuoteNotificationEvent({
      phase: "complete",
      quoteId: payload.quoteId,
      notificationStatus: result.notificationStatus,
      errorSummary: result.errorSummary ?? null,
      customerConfirmationSent: result.customerConfirmationSent ?? false,
    });
  } catch (error) {
    const errorSummary = getErrorMessage(error, "Unable to send notification email.");

    try {
      await persistQuoteNotificationStatus(
        payload.siteId,
        payload.quoteId,
        "failed",
        errorSummary,
      );
    } catch (persistError) {
      logQuoteNotificationEvent({
        phase: "persist_failed",
        quoteId: payload.quoteId,
        notificationStatus: "failed",
        error: getErrorMessage(persistError, "Failed to persist notification status."),
      });
    }

    logQuoteNotificationEvent({
      phase: "failed",
      quoteId: payload.quoteId,
      notificationStatus: "failed",
      errorSummary,
    });
  }
}
