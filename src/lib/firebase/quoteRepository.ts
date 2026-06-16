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
import { db, isFirebaseConfigured } from "./client";

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
  logoPositionX: number | null;
  logoPositionY: number | null;
  artworkUrl: string | null;
  artworkStoragePath: string | null;
  previewImageUrl: string | null;
  previewImageStoragePath: string | null;
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
    logoPositionX: number;
    logoPositionY: number;
    artworkUrl: string;
    artworkStoragePath: string;
    previewImageUrl?: string | null;
    previewImageStoragePath?: string | null;
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
    logoPositionX: readNumber(data.logoPositionX),
    logoPositionY: readNumber(data.logoPositionY),
    artworkUrl: readString(data.artworkUrl),
    artworkStoragePath: readString(data.artworkStoragePath),
    previewImageUrl: readString(data.previewImageUrl),
    previewImageStoragePath: readString(data.previewImageStoragePath),
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
    payload.logoPositionX = input.preview.logoPositionX;
    payload.logoPositionY = input.preview.logoPositionY;
    payload.artworkUrl = input.preview.artworkUrl;
    payload.artworkStoragePath = input.preview.artworkStoragePath;
    payload.previewImageUrl = input.preview.previewImageUrl ?? null;
    payload.previewImageStoragePath = input.preview.previewImageStoragePath ?? null;
  }

  return payload;
}

/**
 * Creates a quote request at sites/{siteId}/quoteRequests/{quoteRequestId}.
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

  await setDoc(docRef, buildQuoteRequestWritePayload(siteId, quoteRequestId, input));

  const saved = await getDoc(docRef);
  const parsed = saved.exists() ? parseQuoteRequest(saved.id, saved.data()) : null;

  if (!parsed) {
    throw new Error("Quote request was saved but could not be read back.");
  }

  return parsed;
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

  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  const saved = await getDoc(docRef);
  const parsed = saved.exists() ? parseQuoteRequest(saved.id, saved.data()) : null;

  if (!parsed) {
    throw new Error("Quote request was updated but could not be read back.");
  }

  return parsed;
}
