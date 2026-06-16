"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatPriceRange,
  getVisibleProductColors,
  type Product,
  type ProductColor,
} from "@/lib/firebase/productRepository";
import { formatProductDisplayName } from "@/lib/productSlugs";

const NEUTRAL_SWATCH = "#cbd5e1";

type ProductDetailProps = {
  product: Product;
};

function ColorSwatch({
  color,
  selected,
  onSelect,
}: {
  color: ProductColor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      title={color.name}
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
        selected
          ? "border-accent bg-accent/10"
          : "border-border hover:border-accent/40"
      }`}
    >
      <span
        className="h-8 w-8 rounded-full border border-slate-300 shadow-sm"
        style={{ backgroundColor: color.hex ?? NEUTRAL_SWATCH }}
      />
      <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-foreground">
        {color.name}
      </span>
    </button>
  );
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const visibleColors = useMemo(() => getVisibleProductColors(product), [product]);
  const [selectedColorId, setSelectedColorId] = useState(
    visibleColors[0]?.id ?? "",
  );

  const selectedColor =
    visibleColors.find((color) => color.id === selectedColorId) ?? visibleColors[0] ?? null;
  const displayName = formatProductDisplayName(product);
  const priceLabel = formatPriceRange(product.basePriceMin, product.basePriceMax);
  const imageUrl = selectedColor?.frontImageUrl ?? visibleColors[0]?.frontImageUrl ?? null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-[#f8fafc]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={selectedColor?.name ?? displayName}
              fill
              className="object-contain p-6"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Image coming soon
            </div>
          )}
        </div>

        {visibleColors.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {visibleColors.map((color) => (
              <ColorSwatch
                key={color.id}
                color={color}
                selected={selectedColor?.id === color.id}
                onSelect={() => setSelectedColorId(color.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            {product.brand}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{displayName}</h1>
          <p className="mt-2 text-muted">
            {product.category}
            {product.styleCode ? ` · ${product.styleCode}` : ""}
          </p>
          {priceLabel && (
            <p className="mt-2 text-lg font-semibold text-foreground">{priceLabel}</p>
          )}
        </div>

        <p className="text-muted">{product.description}</p>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {product.sizes.length > 0 && (
            <div>
              <dt className="font-medium text-foreground">Sizes</dt>
              <dd className="mt-1 text-muted">{product.sizes.join(", ")}</dd>
            </div>
          )}
          {product.material && (
            <div>
              <dt className="font-medium text-foreground">Material</dt>
              <dd className="mt-1 text-muted">{product.material}</dd>
            </div>
          )}
          {product.fabricWeight && (
            <div>
              <dt className="font-medium text-foreground">Fabric weight</dt>
              <dd className="mt-1 text-muted">{product.fabricWeight}</dd>
            </div>
          )}
          {product.fit && (
            <div>
              <dt className="font-medium text-foreground">Fit</dt>
              <dd className="mt-1 text-muted">{product.fit}</dd>
            </div>
          )}
          {product.decorationMethods.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-foreground">Decoration methods</dt>
              <dd className="mt-1 text-muted">{product.decorationMethods.join(", ")}</dd>
            </div>
          )}
        </dl>

        {product.features.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground">Features</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {product.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {product.careInstructions && (
          <div>
            <h2 className="text-base font-semibold text-foreground">Care instructions</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
              {product.careInstructions}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/preview?productId=${product.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Preview with logo
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            Back to products
          </Link>
        </div>
      </div>
    </div>
  );
}
