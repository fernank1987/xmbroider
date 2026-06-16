import { NextResponse } from "next/server";
import { sendQuoteNotificationEmails } from "@/lib/email/sendQuoteNotification";
import type { QuoteNotificationPayload } from "@/lib/email/quoteNotificationTypes";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// TODO: Add rate limiting (e.g. per-IP throttle) before production scale.

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validatePayload(body: unknown): { payload: QuoteNotificationPayload } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }

  const data = body as Record<string, unknown>;
  const quoteId = readString(data.quoteId);
  const siteId = readString(data.siteId);
  const name = readString(data.name);
  const email = readString(data.email);
  const serviceNeeded = readString(data.serviceNeeded);
  const projectDetails = readString(data.projectDetails);
  const source = readString(data.source);

  if (!quoteId || !siteId || !name || !email || !serviceNeeded || !projectDetails || !source) {
    return { error: "Missing required quote notification fields." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email address." };
  }

  return {
    payload: {
      quoteId,
      siteId,
      name,
      email,
      phone: readString(data.phone),
      serviceNeeded,
      quantity: readString(data.quantity),
      deadline: readString(data.deadline),
      projectDetails,
      source,
      productName: readString(data.productName),
      productBrand: readString(data.productBrand),
      productMaterial: readString(data.productMaterial),
      colorName: readString(data.colorName),
      size: readString(data.size),
      placement: readString(data.placement),
      decorationMethod: readString(data.decorationMethod),
      logoWidthMm: readNumber(data.logoWidthMm),
      logoWidthInches: readNumber(data.logoWidthInches),
      sizePresetLabel: readString(data.sizePresetLabel),
      artworkUrl: readString(data.artworkUrl),
      previewImageUrl: readString(data.previewImageUrl),
      productImageUrl: readString(data.productImageUrl),
    },
  };
}

async function persistNotificationStatus(
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validatePayload(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const result = await sendQuoteNotificationEmails(validated.payload);

  try {
    await persistNotificationStatus(
      validated.payload.siteId,
      validated.payload.quoteId,
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
      quoteId: validated.payload.quoteId,
      status: result.notificationStatus,
    });
  }

  return NextResponse.json({
    ok: result.ok,
    notificationStatus: result.notificationStatus,
    customerConfirmationSent: result.customerConfirmationSent ?? false,
    warning: result.notificationStatus === "not_configured" ? result.errorSummary : undefined,
  });
}
