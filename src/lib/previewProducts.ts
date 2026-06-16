import type { Placement } from "./logoPreview";
import type { Product } from "./firebase/productRepository";
import { formatProductDisplayName } from "./productSlugs";
import {
  LOGO_PREVIEW_PRODUCTS,
  type PreviewProduct,
  type ProductVariant,
} from "./logoPreviewProducts";

const DEFAULT_PLACEMENTS: Placement[] = [
  "left_chest",
  "right_chest",
  "center_chest",
  "sleeve",
];

function mapCategoryToService(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("hat") || normalized.includes("cap")) {
    return "hats";
  }
  if (normalized.includes("polo") || normalized.includes("embroidery")) {
    return "embroidery";
  }
  if (normalized.includes("dtf") || normalized.includes("shirt")) {
    return "dtf";
  }
  return "embroidery";
}

export function firestoreProductToPreviewProduct(product: Product): PreviewProduct {
  const variants: ProductVariant[] = product.colors.map((color) => ({
    id: color.id,
    label: color.name,
    colorName: color.name,
    imageSrc: color.frontImageUrl ?? "",
    swatchColor: color.hex ?? "#cbd5e1",
    hasImage: Boolean(color.frontImageUrl),
    previewCalibration: color.previewCalibration,
  }));

  return {
    id: product.id,
    label: formatProductDisplayName(product),
    defaultVariantId: variants[0]?.id ?? "",
    defaultService: mapCategoryToService(product.category),
    placements: DEFAULT_PLACEMENTS,
    variants,
    sizes: product.sizes,
    brand: product.brand,
    category: product.category,
    previewPhysicalWidthMm: product.previewPhysicalWidthMm,
    source: "firestore",
  };
}

export function buildPreviewCatalog(firestoreProducts: Product[]): PreviewProduct[] {
  const catalog = firestoreProducts.map(firestoreProductToPreviewProduct);
  if (catalog.length > 0) {
    return catalog;
  }
  return LOGO_PREVIEW_PRODUCTS;
}

export function findPreviewProduct(
  catalog: PreviewProduct[],
  productId: string | undefined,
): PreviewProduct | undefined {
  if (!productId) {
    return undefined;
  }
  return catalog.find((product) => product.id === productId);
}
