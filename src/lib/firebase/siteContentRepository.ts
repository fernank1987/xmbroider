import type { SiteContent } from "@/lib/siteContent";
import { db, isFirebaseConfigured } from "./client";

const NOT_IMPLEMENTED_MESSAGE =
  "getSiteContentFromFirestore is not implemented yet. The public site continues to use src/lib/siteContent.ts.";

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

/**
 * Loads editable site content from Firestore.
 * Firestore path (planned): sites/{siteId}/content
 */
export async function getSiteContentFromFirestore(
  siteId: string,
): Promise<SiteContent | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  void siteId;
  throw new Error(NOT_IMPLEMENTED_MESSAGE);
}

/**
 * Persists editable site content to Firestore.
 * Firestore path (planned): sites/{siteId}/content
 */
export async function saveSiteContentToFirestore(
  siteId: string,
  content: SiteContent,
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  void siteId;
  void content;
  throw new Error(
    "saveSiteContentToFirestore is not implemented yet. Admin save will be wired in a later phase.",
  );
}
