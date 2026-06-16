import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "./client";
import { slugifyProduct } from "../productSlugs";

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

export type UploadQuoteFileResult = {
  url: string;
  path: string;
  fileName: string;
};

export const QUOTE_ARTWORK_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const QUOTE_ARTWORK_ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type QuoteArtworkContentType =
  (typeof QUOTE_ARTWORK_ALLOWED_CONTENT_TYPES)[number];

/**
 * Builds the Storage path for quote artwork or preview files.
 * Path: sites/{siteId}/quoteUploads/{quoteId}/{fileName}
 */
export function getQuoteUploadStoragePath(
  siteId: string,
  quoteId: string,
  fileName: string,
): string {
  return `sites/${siteId}/quoteUploads/${quoteId}/${fileName}`;
}

export function validateQuoteArtworkFile(file: File): string | null {
  if (
    !QUOTE_ARTWORK_ALLOWED_CONTENT_TYPES.includes(file.type as QuoteArtworkContentType)
  ) {
    return "Only PNG, JPG, and WebP artwork files are allowed.";
  }

  if (file.size > QUOTE_ARTWORK_MAX_FILE_SIZE_BYTES) {
    return "Artwork must be 10MB or smaller.";
  }

  return null;
}

function generateQuoteArtworkFileName(contentType: string): string {
  const extension = extensionForContentType(contentType);
  return `artwork-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
}

/** Uploads customer artwork for a quote request preview submission. */
export async function uploadQuoteArtwork(
  siteId: string,
  quoteId: string,
  file: File,
): Promise<UploadQuoteFileResult> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const validationError = validateQuoteArtworkFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fileName = generateQuoteArtworkFileName(file.type);
  const path = getQuoteUploadStoragePath(siteId, quoteId, fileName);
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  return { url, path, fileName };
}

/** Uploads a generated preview image for a quote request. */
export async function uploadQuotePreviewImage(
  siteId: string,
  quoteId: string,
  blob: Blob,
): Promise<UploadQuoteFileResult> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const fileName = "preview.png";
  const path = getQuoteUploadStoragePath(siteId, quoteId, fileName);
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, { contentType: "image/png" });
  const url = await getDownloadURL(storageRef);

  return { url, path, fileName };
}

export type ProductImageSide = "front" | "back";

export type UploadProductImageResult = {
  url: string;
  path: string;
  fileName: string;
};

/**
 * Builds the Storage path for a catalog product image.
 * Path: sites/{siteId}/products/{brandSlug}/{productSlug}/{fileName}
 *
 * Legacy paths sites/{siteId}/products/{productId}/{fileName} remain valid in Storage;
 * existing download URLs in Firestore continue to work without migration.
 */
export function getProductImageStoragePath(
  siteId: string,
  brandSlug: string,
  productSlug: string,
  fileName: string,
): string {
  return `sites/${siteId}/products/${brandSlug}/${productSlug}/${fileName}`;
}

function generateProductImageFileName(
  colorSlug: string,
  side: ProductImageSide,
  contentType: string,
): string {
  const extension = extensionForContentType(contentType);
  return `${colorSlug}-${side}.${extension}`;
}

/** Uploads a product color image to Firebase Storage. */
export async function uploadProductImage(
  siteId: string,
  brandSlug: string,
  productSlug: string,
  colorName: string,
  side: ProductImageSide,
  file: File,
): Promise<UploadProductImageResult> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const validationError = validateQuoteArtworkFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const colorSlug = slugifyProduct(colorName);
  const fileName = generateProductImageFileName(colorSlug, side, file.type);
  const path = getProductImageStoragePath(siteId, brandSlug, productSlug, fileName);
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  return { url, path, fileName };
}

/** Deletes a product image from Firebase Storage. */
export async function deleteProductImage(storagePath: string): Promise<void> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  await deleteObject(ref(storage, storagePath));
}
