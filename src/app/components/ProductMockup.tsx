"use client";

import { useEffect, useState } from "react";
import { getVariantImageFallbackSrc } from "@/lib/logoPreviewProducts";
import type { ProductVariant } from "@/lib/logoPreviewProducts";

type ProductMockupProps = {
  variant: ProductVariant;
  onImageLoad?: (aspectRatio: number) => void;
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

export default function ProductMockup({ variant, onImageLoad }: ProductMockupProps) {
  const [imageSrc, setImageSrc] = useState(variant.imageSrc);
  const [useFallbackArt, setUseFallbackArt] = useState(
    !variant.imageSrc && !variant.hasImage,
  );

  const handleImageError = () => {
    const fallbackSrc = variant.imageSrc
      ? getVariantImageFallbackSrc(variant.imageSrc)
      : "";
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      return;
    }
    setUseFallbackArt(true);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.naturalWidth > 0 && image.naturalHeight > 0 && onImageLoad) {
      onImageLoad(image.naturalWidth / image.naturalHeight);
    }
  };

  if (useFallbackArt || !variant.imageSrc) {
    return <PoloSvgFallback swatchColor={variant.swatchColor} onImageLoad={onImageLoad} />;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={imageSrc}
      alt={`${variant.colorName} product mockup`}
      onError={handleImageError}
      onLoad={handleImageLoad}
      className="h-full w-full object-contain opacity-100 [mix-blend-mode:normal]"
    />
  );
}
