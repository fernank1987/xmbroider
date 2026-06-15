import { db, isFirebaseConfigured } from "./client";

export type QuoteRequestStatus = "pending" | "reviewed" | "quoted" | "closed";

/** Quote request document shape for future Firestore storage. */
export type QuoteRequest = {
  id: string;
  siteId: string;
  name: string;
  email: string;
  service: string;
  details: string;
  status: QuoteRequestStatus;
  createdAt: string;
  updatedAt?: string;
};

export type CreateQuoteRequestInput = {
  siteId: string;
  name: string;
  email: string;
  service: string;
  details: string;
};

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

/**
 * Creates a quote request from the public quote form.
 * Firestore path (planned): sites/{siteId}/quoteRequests/{quoteId}
 */
export async function createQuoteRequest(
  input: CreateQuoteRequestInput,
): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  void input;
  throw new Error(
    "createQuoteRequest is not implemented yet. Quote form submission will be wired in a later phase.",
  );
}

/**
 * Lists quote requests for the admin dashboard.
 * Firestore path (planned): sites/{siteId}/quoteRequests
 */
export async function listQuoteRequests(
  siteId: string,
): Promise<QuoteRequest[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  void siteId;
  throw new Error(
    "listQuoteRequests is not implemented yet. Admin quotes page will use this in a later phase.",
  );
}

/**
 * Updates quote request status from the admin dashboard.
 */
export async function updateQuoteRequestStatus(
  siteId: string,
  quoteId: string,
  status: QuoteRequestStatus,
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  void siteId;
  void quoteId;
  void status;
  throw new Error("updateQuoteRequestStatus is not implemented yet.");
}
