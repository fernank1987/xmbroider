"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  APPROXIMATE_MOCKUP_WARNING,
  BACK_IMAGE_FALLBACK_WARNING,
  getLocalMockupSvgFallbackUrl,
  logVariantPhotoResolution,
  resolveVariantPhotoUrl,
  type MockupImageSide,
  type VariantPhotoResolution,
} from "@/lib/productMockupImage";
import type { ProductVariant } from "@/lib/logoPreviewProducts";

type ProductMockupProps = {
  variant: ProductVariant;
  imageSide?: MockupImageSide;
  productId?: string;
  onImageLoad?: (aspectRatio: number) => void;
  onApproximateFallback?: (approximate: boolean) => void;
  onPhotoResolutionChange?: (resolution: VariantPhotoResolution) => void;
};

function PoloSvgFallback({
  swatchColor,
  onImageLoad,
}: {
  swatchColor: string;
  onImageLoad?: (aspectRatio: number) => void;
}) {
  useEffect(() => {
    onImageLoad?.(400 / 480);
  }, [onImageLoad]);

  return (
    <svg viewBox="0 0 400 480" className="h-full w-full" aria-hidden="true">
      <rect width="400" height="480" fill="#f8fafc" />
      <path
        d="M112 108 L88 148 L104 380 L296 380 L312 148 L288 108 Z"
        fill={swatchColor}
        stroke="#94a3b8"
        strokeWidth="3"
      />
      <path
        d="M144 108 L200 138 L256 108"
        fill="none"
        stroke="#64748b"
        strokeWidth="3"
      />
      <path
        d="M144 108 L128 124 L144 140 M256 108 L272 124 L256 140"
        fill="none"
        stroke="#64748b"
        strokeWidth="3"
      />
      <path
        d="M112 108 L88 148 L64 168 M288 108 L312 148 L336 168"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProductPhoto({
  photoUrl,
  colorName,
  onImageLoad,
  onLoadFailed,
}: {
  photoUrl: string;
  colorName: string;
  onImageLoad?: (aspectRatio: number) => void;
  onLoadFailed: () => void;
}) {
  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.naturalWidth > 0 && image.naturalHeight > 0 && onImageLoad) {
      onImageLoad(image.naturalWidth / image.naturalHeight);
    }
  };

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={photoUrl}
      alt={`${colorName} product mockup`}
      onError={onLoadFailed}
      onLoad={handleImageLoad}
      className="h-full w-full object-contain opacity-100 [mix-blend-mode:normal]"
    />
  );
}

export default function ProductMockup({
  variant,
  imageSide = "front",
  productId,
  onImageLoad,
  onApproximateFallback,
  onPhotoResolutionChange,
}: ProductMockupProps) {
  const resolution = useMemo(
    () => resolveVariantPhotoUrl(variant, imageSide),
    [variant, imageSide],
  );
  const svgFallbackUrl = useMemo(
    () => (resolution.url ? getLocalMockupSvgFallbackUrl(resolution.url) : null),
    [resolution.url],
  );
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const displayUrl =
    useSvgFallback && svgFallbackUrl ? svgFallbackUrl : resolution.url;
  const useFallbackArt = !displayUrl || loadFailed;
  const showBackFallbackWarning = !useFallbackArt && resolution.usedFrontFallbackForBack;
  const showApproximateWarning =
    useFallbackArt && resolution.fallbackReason === "missing_front_image";

  useEffect(() => {
    onPhotoResolutionChange?.(resolution);
    logVariantPhotoResolution(
      {
        productId,
        colorName: variant.colorName,
        variantId: variant.id,
        imageSide,
      },
      resolution,
      { loadFailed },
    );
  }, [
    resolution,
    productId,
    variant.colorName,
    variant.id,
    imageSide,
    loadFailed,
    onPhotoResolutionChange,
  ]);

  useEffect(() => {
    onApproximateFallback?.(useFallbackArt);
  }, [useFallbackArt, onApproximateFallback]);

  const handlePhotoLoadFailed = () => {
    if (!useSvgFallback && svgFallbackUrl) {
      setUseSvgFallback(true);
      if (process.env.NODE_ENV === "development") {
        console.warn("[preview-mockup] local JPG missing, using SVG fallback", svgFallbackUrl);
      }
      return;
    }

    setLoadFailed(true);
    if (process.env.NODE_ENV === "development") {
      console.warn("[preview-mockup] product photo failed to load", {
        productId: productId ?? "(unknown)",
        colorName: variant.colorName,
        variantId: variant.id,
        productImageUrl: displayUrl,
        fallbackReason: "image_load_failed",
      });
    }
  };

  if (useFallbackArt) {
    return (
      <div className="relative h-full w-full">
        <PoloSvgFallback swatchColor={variant.swatchColor} onImageLoad={onImageLoad} />
        {showApproximateWarning ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-2 px-3 text-center text-[11px] text-amber-800">
            {APPROXIMATE_MOCKUP_WARNING}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ProductPhoto
        key={displayUrl}
        photoUrl={displayUrl}
        colorName={variant.colorName}
        onImageLoad={onImageLoad}
        onLoadFailed={handlePhotoLoadFailed}
      />
      {showBackFallbackWarning ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 px-3 text-center text-[11px] text-amber-800">
          {BACK_IMAGE_FALLBACK_WARNING}
        </p>
      ) : null}
    </div>
  );
}
