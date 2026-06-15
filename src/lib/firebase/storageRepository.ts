import { storage, isFirebaseConfigured } from "./client";

export type UploadGalleryImageInput = {
  siteId: string;
  fileName: string;
  contentType: string;
  data: Blob | ArrayBuffer | Uint8Array;
};

export type UploadGalleryImageResult = {
  /** Public download URL after upload */
  url: string;
  /** Storage object path */
  path: string;
};

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

/**
 * Uploads a gallery image to Firebase Storage.
 * Storage path (planned): sites/{siteId}/gallery/{fileName}
 */
export async function uploadGalleryImage(
  input: UploadGalleryImageInput,
): Promise<UploadGalleryImageResult> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  void input;
  throw new Error(
    "uploadGalleryImage is not implemented yet. Admin gallery upload will be wired in a later phase.",
  );
}

/**
 * Deletes a gallery image from Firebase Storage.
 */
export async function deleteGalleryImage(
  siteId: string,
  storagePath: string,
): Promise<void> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  void siteId;
  void storagePath;
  throw new Error("deleteGalleryImage is not implemented yet.");
}

/**
 * Builds the planned Storage path for a gallery asset.
 */
export function getGalleryStoragePath(siteId: string, fileName: string): string {
  return `sites/${siteId}/gallery/${fileName}`;
}
