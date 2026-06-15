import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "./client";

export type UploadGalleryImageResult = {
  url: string;
  path: string;
  fileName: string;
};

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

/**
 * Builds the Storage path for a gallery asset.
 * Path: sites/{siteId}/gallery/{fileName}
 */
export function getGalleryStoragePath(siteId: string, fileName: string): string {
  return `sites/${siteId}/gallery/${fileName}`;
}

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

export function generateGalleryFileName(contentType: string): string {
  const extension = extensionForContentType(contentType);
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
}

/**
 * Uploads a gallery image to Firebase Storage.
 * Storage path: sites/{siteId}/gallery/{generatedFileName}
 */
export async function uploadGalleryImage(
  siteId: string,
  file: Blob,
  contentType: string,
): Promise<UploadGalleryImageResult> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const fileName = generateGalleryFileName(contentType);
  const path = getGalleryStoragePath(siteId, fileName);
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType });
  const url = await getDownloadURL(storageRef);

  return { url, path, fileName };
}

/**
 * Deletes a gallery image from Firebase Storage.
 */
export async function deleteGalleryImage(storagePath: string): Promise<void> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  await deleteObject(ref(storage, storagePath));
}
