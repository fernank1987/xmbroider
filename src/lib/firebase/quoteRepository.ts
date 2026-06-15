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
  source: "public_quote_form";
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateQuoteRequestInput = {
  name: string;
  email: string;
  phone?: string;
  serviceNeeded: string;
  projectDetails: string;
  quantity?: string;
  deadline?: string;
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

function isQuoteRequestStatus(value: string): value is QuoteRequestStatus {
  return (QUOTE_REQUEST_STATUSES as readonly string[]).includes(value);
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
    source !== "public_quote_form"
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
    source: "public_quote_form",
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
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
  return null;
}

/**
 * Creates a quote request at sites/{siteId}/quoteRequests/{quoteRequestId}.
 */
export async function createQuoteRequest(
  siteId: string,
  input: CreateQuoteRequestInput,
): Promise<QuoteRequest> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const validationError = validateCreateQuoteRequestInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const docRef = doc(getQuoteRequestsCollectionRef(siteId));

  await setDoc(docRef, {
    id: docRef.id,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    serviceNeeded: input.serviceNeeded.trim(),
    projectDetails: input.projectDetails.trim(),
    quantity: input.quantity?.trim() || null,
    deadline: input.deadline?.trim() || null,
    status: "new",
    source: "public_quote_form",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
