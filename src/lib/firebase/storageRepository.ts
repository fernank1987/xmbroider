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

export type UploadBrandLogoResult = {
  url: string;
  path: string;
  fileName: string;
};

export const BRAND_LOGO_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const BRAND_LOGO_ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export type BrandLogoContentType = (typeof BRAND_LOGO_ALLOWED_CONTENT_TYPES)[number];

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
    case "image/svg+xml":
      return "svg";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

/**
 * Builds the Storage path for a brand logo asset.
 * Path: sites/{siteId}/brand/{fileName}
 */
export function getBrandLogoStoragePath(siteId: string, fileName: string): string {
  return `sites/${siteId}/brand/${fileName}`;
}

export function generateBrandLogoFileName(contentType: string): string {
  const extension = extensionForContentType(contentType);
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
}

export function validateBrandLogoFile(file: File): string | null {
  if (!BRAND_LOGO_ALLOWED_CONTENT_TYPES.includes(file.type as BrandLogoContentType)) {
    return "Only PNG, JPG, WebP, and SVG (image/*) files are allowed.";
  }

  if (file.size > BRAND_LOGO_MAX_FILE_SIZE_BYTES) {
    return "Logo must be 5MB or smaller.";
  }

  return null;
}

const UNSAFE_SVG_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /\son[a-z]+\s*=/i,
  /<foreignobject/i,
  /<iframe/i,
];

/** Validates file contents, including a basic safety scan for SVG logos. */
export async function validateBrandLogoFileContents(
  file: File,
): Promise<string | null> {
  const basicError = validateBrandLogoFile(file);
  if (basicError) {
    return basicError;
  }

  if (file.type !== "image/svg+xml") {
    return null;
  }

  const text = await file.text();
  for (const pattern of UNSAFE_SVG_PATTERNS) {
    if (pattern.test(text)) {
      return "SVG logo rejected for safety. Use a plain logo SVG without scripts, event handlers, or embedded HTML.";
    }
  }

  return null;
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

/**
 * Uploads a brand logo to Firebase Storage.
 * Storage path: sites/{siteId}/brand/{generatedFileName}
 */
export async function uploadBrandLogo(
  siteId: string,
  file: File,
): Promise<UploadBrandLogoResult> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const validationError = await validateBrandLogoFileContents(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const contentType = file.type;
  const fileName = generateBrandLogoFileName(contentType);
  const path = getBrandLogoStoragePath(siteId, fileName);
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType });
  const url = await getDownloadURL(storageRef);

  return { url, path, fileName };
}

/**
 * Deletes a brand logo from Firebase Storage.
 */
export async function deleteBrandLogo(storagePath: string): Promise<void> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  await deleteObject(ref(storage, storagePath));
}
