import type { Placement } from "./logoPreview";
import type { ProductVariant } from "./logoPreviewProducts";

export type MockupImageSide = "front" | "back";

export const APPROXIMATE_MOCKUP_WARNING =
  "Product photo unavailable; preview is approximate.";

export const BACK_IMAGE_FALLBACK_WARNING =
  "Back image unavailable; showing front view.";

export type VariantPhotoResolution = {
  url: string | null;
  requestedSide: MockupImageSide;
  resolvedSide: MockupImageSide;
  usedFrontFallbackForBack: boolean;
  missingFrontImage: boolean;
  missingBackImage: boolean;
  fallbackReason: "missing_front_image" | "missing_back_image" | "image_load_failed" | null;
};

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

function readVariantFrontUrl(variant: ProductVariant): string | null {
  const url = variant.imageSrc?.trim();
  return url ? url : null;
}

function readVariantBackUrl(variant: ProductVariant): string | null {
  const url = variant.backImageSrc?.trim();
  return url ? url : null;
}

/** Resolves the product photo URL for a variant and mockup side. */
export function resolveVariantPhotoUrl(
  variant: ProductVariant,
  side: MockupImageSide,
): VariantPhotoResolution {
  const frontUrl = readVariantFrontUrl(variant);
  const backUrl = readVariantBackUrl(variant);

  if (side === "back") {
    if (backUrl) {
      return {
        url: backUrl,
        requestedSide: "back",
        resolvedSide: "back",
        usedFrontFallbackForBack: false,
        missingFrontImage: !frontUrl,
        missingBackImage: false,
        fallbackReason: null,
      };
    }

    if (frontUrl) {
      return {
        url: frontUrl,
        requestedSide: "back",
        resolvedSide: "front",
        usedFrontFallbackForBack: true,
        missingFrontImage: false,
        missingBackImage: true,
        fallbackReason: "missing_back_image",
      };
    }

    return {
      url: null,
      requestedSide: "back",
      resolvedSide: "back",
      usedFrontFallbackForBack: false,
      missingFrontImage: true,
      missingBackImage: true,
      fallbackReason: "missing_front_image",
    };
  }

  if (frontUrl) {
    return {
      url: frontUrl,
      requestedSide: "front",
      resolvedSide: "front",
      usedFrontFallbackForBack: false,
      missingFrontImage: false,
      missingBackImage: !backUrl,
      fallbackReason: null,
    };
  }

  return {
    url: null,
    requestedSide: "front",
    resolvedSide: "front",
    usedFrontFallbackForBack: false,
    missingFrontImage: true,
    missingBackImage: !backUrl,
    fallbackReason: "missing_front_image",
  };
}

export function getVariantPhotoUrl(
  variant: ProductVariant,
  side: MockupImageSide,
): string | null {
  return resolveVariantPhotoUrl(variant, side).url;
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

export function getLocalMockupSvgFallbackUrl(jpgOrEmptyUrl: string): string | null {
  const trimmed = jpgOrEmptyUrl.trim();
  if (!trimmed.startsWith("/") || !trimmed.toLowerCase().endsWith(".jpg")) {
    return null;
  }
  return trimmed.replace(/\.jpg$/i, ".svg");
}

export function logVariantPhotoResolution(
  context: {
    productId?: string;
    colorName?: string;
    variantId?: string;
    imageSide?: MockupImageSide;
  },
  resolution: VariantPhotoResolution,
  options?: { loadFailed?: boolean },
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const reason =
    options?.loadFailed === true
      ? "image_load_failed"
      : resolution.fallbackReason;

  console.log("[preview-mockup]", {
    productId: context.productId ?? "(unknown)",
    colorName: context.colorName ?? "(unknown)",
    variantId: context.variantId ?? "(unknown)",
    requestedSide: context.imageSide ?? resolution.requestedSide,
    resolvedSide: resolution.resolvedSide,
    productImageUrl: resolution.url,
    usedFrontFallbackForBack: resolution.usedFrontFallbackForBack,
    missingFrontImage: resolution.missingFrontImage,
    missingBackImage: resolution.missingBackImage,
    fallbackReason: reason,
  });
}
