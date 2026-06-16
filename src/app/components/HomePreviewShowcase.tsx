"use client";

import ProductMockup from "./ProductMockup";
import type { ProductVariant } from "@/lib/logoPreviewProducts";

type HomePreviewShowcaseProps = {
  variant: ProductVariant;
  productLabel: string;
  mockupTitle: string;
  mockupSubtitle: string;
};

export default function HomePreviewShowcase({
  variant,
  productLabel,
  mockupTitle,
  mockupSubtitle,
}: HomePreviewShowcaseProps) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br from-accent/20 via-transparent to-accent/10 opacity-80 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-lg shadow-foreground/5">
        <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Live product preview
          </p>
          <p className="truncate text-xs text-muted">
            {productLabel} · {variant.colorName}
          </p>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f8fafc] [color-scheme:light]">
          <ProductMockup variant={variant} />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/80 to-transparent px-4 pb-4 pt-10 sm:px-5"
            aria-hidden="true"
          >
            <p className="text-sm font-medium text-slate-700">{mockupTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{mockupSubtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
