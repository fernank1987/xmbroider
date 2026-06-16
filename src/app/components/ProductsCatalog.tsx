"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatPriceRange,
  getProductCoverImageUrl,
  type Product,
} from "@/lib/firebase/productRepository";
import {
  filterProductsByBrand,
  formatProductDisplayName,
  getProductBrands,
  groupProductsByBrand,
} from "@/lib/productSlugs";

function ProductPlaceholderIcon() {
  return (
    <svg
      className="h-12 w-12 text-muted/30"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ProductCard({ product }: { product: Product }) {
  const coverUrl = getProductCoverImageUrl(product);
  const priceLabel = formatPriceRange(product.basePriceMin, product.basePriceMax);
  const displayName = formatProductDisplayName(product);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-foreground/[0.04]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={displayName}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ProductPlaceholderIcon />
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {product.brand}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            <Link href={`/products/${product.id}`} className="hover:text-accent">
              {displayName}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted">{product.category}</p>
          {product.material && (
            <p className="mt-1 text-sm text-muted">{product.material}</p>
          )}
          {priceLabel && (
            <p className="mt-1 text-sm font-medium text-foreground">{priceLabel}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            View details
          </Link>
          <Link
            href={`/preview?productId=${product.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Preview with logo
          </Link>
        </div>
      </div>
    </article>
  );
}

type ProductsCatalogProps = {
  products: Product[];
};

export default function ProductsCatalog({ products }: ProductsCatalogProps) {
  const brands = useMemo(() => getProductBrands(products), [products]);
  const [brandFilter, setBrandFilter] = useState("all");

  const filteredProducts = useMemo(
    () => filterProductsByBrand(products, brandFilter),
    [products, brandFilter],
  );

  const groupedProducts = useMemo(
    () => groupProductsByBrand(filteredProducts),
    [filteredProducts],
  );

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface px-8 py-12 text-center">
        <p className="text-muted">
          Products are being added. Check back soon or request a quote directly.
        </p>
        <Link
          href="/#quote"
          className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
        >
          Request a quote →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {brands.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBrandFilter("all")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              brandFilter === "all"
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted hover:border-accent/40 hover:text-foreground"
            }`}
          >
            All brands
          </button>
          {brands.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setBrandFilter(brand)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                brandFilter === brand
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted hover:border-accent/40 hover:text-foreground"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      {brandFilter === "all" ? (
        groupedProducts.map((group) => (
          <section key={group.brand} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">{group.brand}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">{brandFilter}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
