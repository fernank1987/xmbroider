export type ProductColorImageFields = {
  frontImageUrl: string | null;
  frontImageStoragePath: string | null;
  backImageUrl: string | null;
  backImageStoragePath: string | null;
};

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNestedString(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!record) {
    return null;
  }
  return readOptionalString(record[key]);
}

/** Normalizes product color image fields from Firestore/admin legacy shapes. */
export function normalizeProductColorImages(
  data: Record<string, unknown>,
): ProductColorImageFields {
  const images =
    typeof data.images === "object" && data.images !== null
      ? (data.images as Record<string, unknown>)
      : null;

  const frontImageUrl =
    readOptionalString(data.frontImageUrl) ??
    readOptionalString(data.frontUrl) ??
    readOptionalString(data.imageUrl) ??
    readOptionalString(data.photoUrl) ??
    readNestedString(images, "front") ??
    readOptionalString(data.front);

  const backImageUrl =
    readOptionalString(data.backImageUrl) ??
    readOptionalString(data.backUrl) ??
    readNestedString(images, "back") ??
    readOptionalString(data.back);

  const frontImageStoragePath =
    readOptionalString(data.frontImageStoragePath) ??
    readOptionalString(data.frontStoragePath) ??
    readNestedString(images, "frontStoragePath") ??
    readOptionalString(data.frontImagePath);

  const backImageStoragePath =
    readOptionalString(data.backImageStoragePath) ??
    readOptionalString(data.backStoragePath) ??
    readNestedString(images, "backStoragePath") ??
    readOptionalString(data.backImagePath);

  return {
    frontImageUrl,
    frontImageStoragePath,
    backImageUrl,
    backImageStoragePath,
  };
}

export function hasProductColorFrontImage(color: ProductColorImageFields): boolean {
  return Boolean(color.frontImageUrl?.trim());
}

export function hasProductColorBackImage(color: ProductColorImageFields): boolean {
  return Boolean(color.backImageUrl?.trim());
}

export type PreviewVariantImageFields = {
  imageSrc: string;
  backImageSrc: string;
  hasImage: boolean;
  hasBackImage: boolean;
};

/** Maps normalized Firestore color images to preview variant fields. */
export function toPreviewVariantImages(
  color: ProductColorImageFields,
): PreviewVariantImageFields {
  const frontImageUrl = color.frontImageUrl?.trim() ?? "";
  const backImageUrl = color.backImageUrl?.trim() ?? "";

  return {
    imageSrc: frontImageUrl,
    backImageSrc: backImageUrl,
    hasImage: Boolean(frontImageUrl),
    hasBackImage: Boolean(backImageUrl),
  };
}
