import type { Placement } from "./logoPreview";
import type { PreviewCalibration } from "./previewCalibration";

export type PreviewProduct = {
  id: string;
  label: string;
  defaultVariantId: string;
  defaultService: string;
  placements: Placement[];
  variants: ProductVariant[];
  sizes?: string[];
  brand?: string;
  category?: string;
  previewPhysicalWidthMm?: number | null;
  source?: "firestore" | "fallback";
};

export type ProductVariant = {
  id: string;
  label: string;
  colorName: string;
  imageSrc: string;
  swatchColor: string;
  hasImage?: boolean;
  previewCalibration?: PreviewCalibration | null;
};

const ST550_VARIANT_DEFS: Array<{
  id: string;
  colorName: string;
  swatchColor: string;
}> = [
  { id: "atomic-blue", colorName: "Atomic Blue", swatchColor: "#5B9BD5" },
  { id: "black", colorName: "Black", swatchColor: "#1F2937" },
  { id: "carolina-blue", colorName: "Carolina Blue", swatchColor: "#7BAFD4" },
  { id: "deep-orange", colorName: "Deep Orange", swatchColor: "#E87722" },
  { id: "deep-red", colorName: "Deep Red", swatchColor: "#9B2335" },
  { id: "forest-green", colorName: "Forest Green", swatchColor: "#2D5A3D" },
  { id: "gold", colorName: "Gold", swatchColor: "#C5A572" },
  { id: "iron-grey", colorName: "Iron Grey", swatchColor: "#6B7280" },
  { id: "kelly-green", colorName: "Kelly Green", swatchColor: "#2E8B57" },
  { id: "maroon", colorName: "Maroon", swatchColor: "#7B1E3A" },
  { id: "purple", colorName: "Purple", swatchColor: "#6B4C9A" },
  { id: "royal", colorName: "Royal", swatchColor: "#4169E1" },
  { id: "silver", colorName: "Silver", swatchColor: "#C0C0C0" },
  { id: "true-navy", colorName: "True Navy", swatchColor: "#1B2A4A" },
  { id: "true-red", colorName: "True Red", swatchColor: "#C41E3A" },
  { id: "white", colorName: "White", swatchColor: "#F8FAFC" },
];

function buildSt550ImageSrc(variantId: string): string {
  return `/mockups/st550/${variantId}-front.jpg`;
}

export const ST550_VARIANTS: ProductVariant[] = ST550_VARIANT_DEFS.map((variant) => ({
  id: variant.id,
  label: variant.colorName,
  colorName: variant.colorName,
  imageSrc: buildSt550ImageSrc(variant.id),
  swatchColor: variant.swatchColor,
}));

export const ST550_POLO: PreviewProduct = {
  id: "st550",
  label: "Sport-Tek ST550 Polo",
  defaultVariantId: "atomic-blue",
  defaultService: "embroidery",
  placements: ["left_chest", "right_chest", "center_chest", "sleeve"],
  variants: ST550_VARIANTS,
  source: "fallback",
};

export const LOGO_PREVIEW_PRODUCTS: PreviewProduct[] = [ST550_POLO];

export function getPreviewProduct(productId: string): PreviewProduct | undefined {
  return LOGO_PREVIEW_PRODUCTS.find((product) => product.id === productId);
}

export function getProductVariant(
  product: PreviewProduct,
  variantId: string,
): ProductVariant | undefined {
  return product.variants.find((variant) => variant.id === variantId);
}

export function getDefaultVariant(product: PreviewProduct): ProductVariant {
  const variant = getProductVariant(product, product.defaultVariantId);
  if (!variant) {
    return product.variants[0];
  }
  return variant;
}

export function getVariantImageFallbackSrc(imageSrc: string): string {
  return imageSrc.replace(/\.jpg$/i, ".svg");
}
