import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { removeUndefinedDeep } from "./firestoreUtils";
import { db, isFirebaseConfigured } from "./client";
import type { PreviewCalibrationSource } from "../previewCalibration";

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

export const QUOTE_REQUEST_STATUSES = [
  "new",
  "reviewed",
  "quoted",
  "approved",
  "completed",
  "archived",
] as const;

export type QuoteRequestStatus = (typeof QUOTE_REQUEST_STATUSES)[number];

export const QUOTE_REQUEST_SOURCES = [
  "public_quote_form",
  "logo_preview_tool",
] as const;

export type QuoteRequestSource = (typeof QUOTE_REQUEST_SOURCES)[number];

export const QUOTE_NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "failed",
  "not_configured",
] as const;

export type QuoteNotificationStatus = (typeof QUOTE_NOTIFICATION_STATUSES)[number];

export type QuoteRequestPreviewData = {
  productId: string | null;
  productName: string | null;
  productType: string | null;
  productLabel: string | null;
  productVariantId: string | null;
  colorName: string | null;
  size: string | null;
  productImageUrl: string | null;
  placement: string | null;
  logoSize: number | null;
  logoWidthMm: number | null;
  logoWidthInches: number | null;
  estimatedLogoHeightMm: number | null;
  productPhysicalWidthMm: number | null;
  sizePresetLabel: string | null;
  previewCalibrationUsed: boolean | null;
  previewCalibrationSource: PreviewCalibrationSource | null;
  productBrand: string | null;
  productMaterial: string | null;
  decorationMethod: string | null;
  logoPositionX: number | null;
  logoPositionY: number | null;
  artworkUrl: string | null;
  artworkStoragePath: string | null;
  previewImageUrl: string | null;
  previewImageStoragePath: string | null;
  previewCompositeUrl: string | null;
  previewCompositeStoragePath: string | null;
  previewCompositeExportError: string | null;
};

export type QuoteRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  serviceNeeded: string;
  projectDetails: string;
  quantity: string | null;
  deadline: string | null;
  status: QuoteRequestStatus;
  source: QuoteRequestSource;
  adminReadAt: string | null;
  notificationStatus: QuoteNotificationStatus | null;
  notificationSentAt: string | null;
  notificationErrorSummary: string | null;
  createdAt: string | null;
  updatedAt: string | null;
} & QuoteRequestPreviewData;

export type CreateQuoteRequestInput = {
  name: string;
  email: string;
  phone?: string;
  serviceNeeded: string;
  projectDetails: string;
  quantity?: string;
  deadline?: string;
  source?: QuoteRequestSource;
  preview?: {
    productId: string;
    productName: string;
    productType: string;
    productLabel: string;
    productVariantId: string;
    colorName: string;
    size?: string | null;
    productImageUrl?: string | null;
    placement: string;
    logoSize: number;
    logoWidthMm: number;
    logoWidthInches: number;
    estimatedLogoHeightMm?: number | null;
    productPhysicalWidthMm: number;
    sizePresetLabel: string;
    previewCalibrationUsed?: boolean;
    previewCalibrationSource?: PreviewCalibrationSource;
    productBrand?: string | null;
    productMaterial?: string | null;
    decorationMethod?: string | null;
    logoPositionX: number;
    logoPositionY: number;
    artworkUrl: string;
    artworkStoragePath: string;
    previewImageUrl?: string | null;
    previewImageStoragePath?: string | null;
    previewCompositeUrl?: string | null;
    previewCompositeStoragePath?: string | null;
    previewCompositeExportError?: string | null;
  };
};

function getQuoteRequestsCollectionRef(siteId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return collection(db, "sites", siteId, "quoteRequests");
}

function getQuoteRequestDocRef(siteId: string, quoteRequestId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return doc(db, "sites", siteId, "quoteRequests", quoteRequestId);
}

export function generateQuoteRequestId(siteId: string): string {
  return doc(getQuoteRequestsCollectionRef(siteId)).id;
}

function parseTimestamp(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate().toISOString();
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function isQuoteRequestStatus(value: string): value is QuoteRequestStatus {
  return (QUOTE_REQUEST_STATUSES as readonly string[]).includes(value);
}

function isQuoteRequestSource(value: string): value is QuoteRequestSource {
  return (QUOTE_REQUEST_SOURCES as readonly string[]).includes(value);
}

function isQuoteNotificationStatus(value: string): value is QuoteNotificationStatus {
  return (QUOTE_NOTIFICATION_STATUSES as readonly string[]).includes(value);
}

function readNotificationStatus(value: unknown): QuoteNotificationStatus | null {
  const status = readString(value);
  if (!status || !isQuoteNotificationStatus(status)) {
    return null;
  }
  return status;
}

function readPreviewCalibrationSource(value: unknown): PreviewCalibrationSource | null {
  if (
    value === "custom-color" ||
    value === "product-default" ||
    value === "category-default"
  ) {
    return value;
  }
  return null;
}

function parseQuoteRequestPreviewData(data: DocumentData): QuoteRequestPreviewData {
  return {
    productId: readString(data.productId),
    productName: readString(data.productName),
    productType: readString(data.productType),
    productLabel: readString(data.productLabel),
    productVariantId: readString(data.productVariantId),
    colorName: readString(data.colorName),
    size: readString(data.size),
    productImageUrl: readString(data.productImageUrl),
    placement: readString(data.placement),
    logoSize: readNumber(data.logoSize),
    logoWidthMm: readNumber(data.logoWidthMm),
    logoWidthInches: readNumber(data.logoWidthInches),
    estimatedLogoHeightMm: readNumber(data.estimatedLogoHeightMm),
    productPhysicalWidthMm: readNumber(data.productPhysicalWidthMm),
    sizePresetLabel: readString(data.sizePresetLabel),
    previewCalibrationUsed:
      typeof data.previewCalibrationUsed === "boolean" ? data.previewCalibrationUsed : null,
    previewCalibrationSource: readPreviewCalibrationSource(data.previewCalibrationSource),
    productBrand: readString(data.productBrand),
    productMaterial: readString(data.productMaterial),
    decorationMethod: readString(data.decorationMethod),
    logoPositionX: readNumber(data.logoPositionX),
    logoPositionY: readNumber(data.logoPositionY),
    artworkUrl: readString(data.artworkUrl),
    artworkStoragePath: readString(data.artworkStoragePath),
    previewImageUrl: readString(data.previewImageUrl),
    previewImageStoragePath: readString(data.previewImageStoragePath),
    previewCompositeUrl: readString(data.previewCompositeUrl),
    previewCompositeStoragePath: readString(data.previewCompositeStoragePath),
    previewCompositeExportError: readString(data.previewCompositeExportError),
  };
}

function parseQuoteRequest(id: string, data: DocumentData): QuoteRequest | null {
  const name = readString(data.name);
  const email = readString(data.email);
  const serviceNeeded = readString(data.serviceNeeded);
  const projectDetails = readString(data.projectDetails);
  const status = readString(data.status);
  const source = readString(data.source);

  if (
    !name ||
    !email ||
    !serviceNeeded ||
    !projectDetails ||
    !status ||
    !isQuoteRequestStatus(status) ||
    !source ||
    !isQuoteRequestSource(source)
  ) {
    return null;
  }

  const phone = readString(data.phone);
  const quantity = readString(data.quantity);
  const deadline = readString(data.deadline);

  return {
    id,
    name,
    email,
    phone,
    serviceNeeded,
    projectDetails,
    quantity,
    deadline,
    status,
    source,
    adminReadAt: parseTimestamp(data.adminReadAt),
    notificationStatus: readNotificationStatus(data.notificationStatus),
    notificationSentAt: parseTimestamp(data.notificationSentAt),
    notificationErrorSummary: readString(data.notificationErrorSummary),
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
    ...parseQuoteRequestPreviewData(data),
  };
}

function validateCreateQuoteRequestInput(input: CreateQuoteRequestInput): string | null {
  if (!input.name.trim()) {
    return "Name is required.";
  }
  if (!input.email.trim()) {
    return "Email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Enter a valid email address.";
  }
  if (!input.serviceNeeded.trim()) {
    return "Service needed is required.";
  }
  if (!input.projectDetails.trim()) {
    return "Project details are required.";
  }
  if (input.source === "logo_preview_tool" && !input.preview) {
    return "Preview submission is missing artwork and placement details.";
  }
  return null;
}

function buildQuoteRequestWritePayload(
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

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
  }

  return payload;
}

function sanitizeQuoteWritePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return removeUndefinedDeep(payload, { path: "quoteRequests" }) as Record<string, unknown>;
}

function emptyQuoteRequestPreviewData(): QuoteRequestPreviewData {
  return {
    productId: null,
    productName: null,
    productType: null,
    productLabel: null,
    productVariantId: null,
    colorName: null,
    size: null,
    productImageUrl: null,
    placement: null,
    logoSize: null,
    logoWidthMm: null,
    logoWidthInches: null,
    estimatedLogoHeightMm: null,
    productPhysicalWidthMm: null,
    sizePresetLabel: null,
    previewCalibrationUsed: null,
    previewCalibrationSource: null,
    productBrand: null,
    productMaterial: null,
    decorationMethod: null,
    logoPositionX: null,
    logoPositionY: null,
    artworkUrl: null,
    artworkStoragePath: null,
    previewImageUrl: null,
    previewImageStoragePath: null,
    previewCompositeUrl: null,
    previewCompositeStoragePath: null,
    previewCompositeExportError: null,
  };
}

/** Builds the in-memory quote returned to public clients (no Firestore read-back). */
function buildQuoteRequestFromInput(
  quoteRequestId: string,
  input: CreateQuoteRequestInput,
): QuoteRequest {
  const source = input.source ?? "public_quote_form";
  const now = new Date().toISOString();
  const preview = input.preview;

  const previewData: QuoteRequestPreviewData = preview
    ? {
        productId: preview.productId,
        productName: preview.productName,
        productType: preview.productType,
        productLabel: preview.productLabel,
        productVariantId: preview.productVariantId,
        colorName: preview.colorName,
        size: preview.size ?? null,
        productImageUrl: preview.productImageUrl ?? null,
        placement: preview.placement,
        logoSize: preview.logoSize,
        logoWidthMm: preview.logoWidthMm,
        logoWidthInches: preview.logoWidthInches,
        estimatedLogoHeightMm: preview.estimatedLogoHeightMm ?? null,
        productPhysicalWidthMm: preview.productPhysicalWidthMm,
        sizePresetLabel: preview.sizePresetLabel,
        previewCalibrationUsed: preview.previewCalibrationUsed ?? false,
        previewCalibrationSource: preview.previewCalibrationSource ?? null,
        productBrand: preview.productBrand ?? null,
        productMaterial: preview.productMaterial ?? null,
        decorationMethod: preview.decorationMethod ?? null,
        logoPositionX: preview.logoPositionX,
        logoPositionY: preview.logoPositionY,
        artworkUrl: preview.artworkUrl,
        artworkStoragePath: preview.artworkStoragePath,
        previewImageUrl: preview.previewImageUrl ?? null,
        previewImageStoragePath: preview.previewImageStoragePath ?? null,
        previewCompositeUrl: preview.previewCompositeUrl ?? null,
        previewCompositeStoragePath: preview.previewCompositeStoragePath ?? null,
        previewCompositeExportError: preview.previewCompositeExportError ?? null,
      }
    : emptyQuoteRequestPreviewData();

  return {
    id: quoteRequestId,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    serviceNeeded: input.serviceNeeded.trim(),
    projectDetails: input.projectDetails.trim(),
    quantity: input.quantity?.trim() || null,
    deadline: input.deadline?.trim() || null,
    status: "new",
    source,
    adminReadAt: null,
    notificationStatus: "pending",
    notificationSentAt: null,
    notificationErrorSummary: null,
    createdAt: now,
    updatedAt: now,
    ...previewData,
  };
}

/**
 * Creates a quote request at sites/{siteId}/quoteRequests/{quoteRequestId}.
 * Public clients may only create — Firestore rules do not allow public read/update.
 * Returns a locally built quote object; notification status is updated server-side.
 */
export async function createQuoteRequest(
  siteId: string,
  input: CreateQuoteRequestInput,
  options?: { quoteRequestId?: string },
): Promise<QuoteRequest> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const validationError = validateCreateQuoteRequestInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const quoteRequestId = options?.quoteRequestId ?? generateQuoteRequestId(siteId);
  const docRef = getQuoteRequestDocRef(siteId, quoteRequestId);

  await setDoc(docRef, sanitizeQuoteWritePayload(buildQuoteRequestWritePayload(siteId, quoteRequestId, input)));

  return buildQuoteRequestFromInput(quoteRequestId, input);
}

/** Lists quote requests for admin, newest first. */
export async function listQuoteRequests(siteId: string): Promise<QuoteRequest[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const itemsQuery = query(
      getQuoteRequestsCollectionRef(siteId),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(itemsQuery);

    return snapshot.docs
      .map((itemDoc) => parseQuoteRequest(itemDoc.id, itemDoc.data()))
      .filter((item): item is QuoteRequest => item !== null);
  } catch {
    return [];
  }
}

/** Updates quote request status from the admin dashboard. */
export async function updateQuoteRequestStatus(
  siteId: string,
  quoteId: string,
  status: QuoteRequestStatus,
): Promise<QuoteRequest> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  if (!isQuoteRequestStatus(status)) {
    throw new Error("Invalid quote request status.");
  }

  const docRef = getQuoteRequestDocRef(siteId, quoteId);

  const update: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status !== "new") {
    update.adminReadAt = serverTimestamp();
  }

  await updateDoc(docRef, update);

  const saved = await getDoc(docRef);
  const parsed = saved.exists() ? parseQuoteRequest(saved.id, saved.data()) : null;

  if (!parsed) {
    throw new Error("Quote request was updated but could not be read back.");
  }

  return parsed;
}

/** Marks a quote as reviewed/read in admin without changing status. */
export async function markQuoteRequestAsRead(
  siteId: string,
  quoteId: string,
): Promise<QuoteRequest> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const docRef = getQuoteRequestDocRef(siteId, quoteId);

  await updateDoc(docRef, {
    adminReadAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const saved = await getDoc(docRef);
  const parsed = saved.exists() ? parseQuoteRequest(saved.id, saved.data()) : null;

  if (!parsed) {
    throw new Error("Quote request was updated but could not be read back.");
  }

  return parsed;
}
