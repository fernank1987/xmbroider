import type { Placement } from "./logoPreview";
import type { ProductVariant } from "./logoPreviewProducts";

export type MockupImageSide = "front" | "back";

export const APPROXIMATE_MOCKUP_WARNING =
  "Product photo unavailable; preview is approximate.";

export function isBackPlacement(placement: Placement): boolean {
  return placement === "back";
}

export function getMockupImageSideForPlacement(placement: Placement): MockupImageSide {
  return isBackPlacement(placement) ? "back" : "front";
}

export function resolveMockupImageSide(placements: Placement[]): MockupImageSide {
  const enabled = placements.filter(Boolean);
  if (enabled.length > 0 && enabled.every(isBackPlacement)) {
    return "back";
  }
  return "front";
}

export function getVariantPhotoUrl(
  variant: ProductVariant,
  side: MockupImageSide,
): string | null {
  if (side === "back") {
    return variant.backImageSrc?.trim() || null;
  }
  return variant.imageSrc?.trim() || null;
}

export function toAbsoluteAssetUrl(src: string | null | undefined): string | null {
  if (!src?.trim()) {
    return null;
  }

  const trimmed = src.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/") && typeof window !== "undefined") {
    return `${window.location.origin}${trimmed}`;
  }

  return trimmed;
}

export function getVariantPhotoUrlForPlacement(
  variant: ProductVariant,
  placement: Placement,
): string | null {
  return getVariantPhotoUrl(variant, getMockupImageSideForPlacement(placement));
}
