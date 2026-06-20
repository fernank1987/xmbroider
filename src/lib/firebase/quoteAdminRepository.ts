import { FieldValue } from "firebase-admin/firestore";
import {
  buildQuoteRequestFromInput,
  validateCreateQuoteRequestInput,
  type CreateQuoteRequestInput,
  type QuoteRequest,
} from "./quoteRepository";
import { getAdminFirestore } from "./admin";
import { removeUndefinedDeep } from "./firestoreUtils";

const ADMIN_DISABLED_MESSAGE =
  "Server quote storage is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON.";

function buildQuoteRequestAdminPayload(
  siteId: string,
  quoteRequestId: string,
  input: CreateQuoteRequestInput,
): Record<string, unknown> {
  const source = input.source ?? "public_quote_form";

  const payload: Record<string, unknown> = {
    id: quoteRequestId,
    siteId,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    serviceNeeded: input.serviceNeeded.trim(),
    projectDetails: input.projectDetails.trim(),
    quantity: input.quantity?.trim() || null,
    deadline: input.deadline?.trim() || null,
    status: "new",
    source,
    notificationStatus: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.priceEstimate) {
    payload.priceEstimate = input.priceEstimate;
    payload.pricingVersion = input.priceEstimate.pricingVersion;
  }

  if (input.preview) {
    payload.productId = input.preview.productId;
    payload.productName = input.preview.productName;
    payload.productType = input.preview.productType;
    payload.productLabel = input.preview.productLabel;
    payload.productVariantId = input.preview.productVariantId;
    payload.colorName = input.preview.colorName;
    payload.size = input.preview.size ?? null;
    payload.productImageUrl = input.preview.productImageUrl ?? null;
    payload.placement = input.preview.placement;
    payload.logoSize = input.preview.logoSize;
    payload.logoWidthMm = input.preview.logoWidthMm;
    payload.logoWidthInches = input.preview.logoWidthInches;
    payload.estimatedLogoHeightMm = input.preview.estimatedLogoHeightMm ?? null;
    payload.productPhysicalWidthMm = input.preview.productPhysicalWidthMm;
    payload.sizePresetLabel = input.preview.sizePresetLabel;
    payload.previewCalibrationUsed = input.preview.previewCalibrationUsed ?? false;
    payload.previewCalibrationSource = input.preview.previewCalibrationSource ?? null;
    payload.productBrand = input.preview.productBrand ?? null;
    payload.productMaterial = input.preview.productMaterial ?? null;
    payload.decorationMethod = input.preview.decorationMethod ?? null;
    payload.logoPositionX = input.preview.logoPositionX;
    payload.logoPositionY = input.preview.logoPositionY;
    payload.artworkUrl = input.preview.artworkUrl;
    payload.artworkStoragePath = input.preview.artworkStoragePath;
    payload.previewImageUrl = input.preview.previewImageUrl ?? null;
    payload.previewImageStoragePath = input.preview.previewImageStoragePath ?? null;
    payload.previewCompositeUrl = input.preview.previewCompositeUrl ?? null;
    payload.previewCompositeStoragePath = input.preview.previewCompositeStoragePath ?? null;
    payload.previewCompositeExportError = input.preview.previewCompositeExportError ?? null;
    if (input.preview.logoPlacements && input.preview.logoPlacements.length > 0) {
      payload.logoPlacements = input.preview.logoPlacements;
    }
  }

  return removeUndefinedDeep(payload, { path: "quoteRequests" }) as Record<string, unknown>;
}

/** Creates a quote request using Firebase Admin SDK (server-only). */
export async function createQuoteRequestAdmin(
  siteId: string,
  input: CreateQuoteRequestInput,
  options?: { quoteRequestId?: string },
): Promise<QuoteRequest> {
  const db = getAdminFirestore();
  if (!db) {
    throw new Error(ADMIN_DISABLED_MESSAGE);
  }

  const validationError = validateCreateQuoteRequestInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const quoteRequestId =
    options?.quoteRequestId ??
    db.collection("sites").doc(siteId).collection("quoteRequests").doc().id;

  await db
    .collection("sites")
    .doc(siteId)
    .collection("quoteRequests")
    .doc(quoteRequestId)
    .set(buildQuoteRequestAdminPayload(siteId, quoteRequestId, input));

  return buildQuoteRequestFromInput(quoteRequestId, input);
}
