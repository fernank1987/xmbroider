import { getAdminFirestore, getAdminStorageBucket } from "./firebase/admin";
import { getQuoteUploadStoragePath } from "./firebase/storageRepository";

const ADMIN_DISABLED_MESSAGE =
  "Admin delete is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON.";

export type DeleteQuoteRequestAdminResult = {
  quoteRequestId: string;
  deletedFilesCount: number;
  storageErrors: string[];
};

function isSafeQuoteRequestId(quoteRequestId: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(quoteRequestId);
}

function getQuoteUploadPrefix(siteId: string, quoteRequestId: string): string {
  return `${getQuoteUploadStoragePath(siteId, quoteRequestId, "").replace(/\/$/, "")}/`;
}

/** Deletes quote upload files and the Firestore quote request document. */
export async function deleteQuoteRequestAdmin(
  siteId: string,
  quoteRequestId: string,
): Promise<DeleteQuoteRequestAdminResult> {
  if (!isSafeQuoteRequestId(quoteRequestId)) {
    throw new Error("Invalid quote request id.");
  }

  const db = getAdminFirestore();
  const bucket = getAdminStorageBucket();
  if (!db || !bucket) {
    throw new Error(ADMIN_DISABLED_MESSAGE);
  }

  const uploadPrefix = getQuoteUploadPrefix(siteId, quoteRequestId);
  let deletedFilesCount = 0;
  const storageErrors: string[] = [];

  try {
    const [files] = await bucket.getFiles({ prefix: uploadPrefix });
    for (const file of files) {
      if (!file.name.startsWith(uploadPrefix)) {
        storageErrors.push(`Skipped unsafe storage path: ${file.name}`);
        continue;
      }

      try {
        await file.delete({ ignoreNotFound: true });
        deletedFilesCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Failed to delete ${file.name}`;
        storageErrors.push(message);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list quote upload files.";
    storageErrors.push(message);
  }

  const docRef = db.doc(`sites/${siteId}/quoteRequests/${quoteRequestId}`);
  await docRef.delete();

  return {
    quoteRequestId,
    deletedFilesCount,
    storageErrors,
  };
}
