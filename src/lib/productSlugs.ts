import type { Product } from "./firebase/productRepository";

/** Slugifies a brand name for Storage paths, e.g. "Sport-Tek" → "sport-tek". */
export function slugifyBrand(brand: string): string {
  return slugifyProduct(brand);
}

/** Slugifies a product name or style/model code, e.g. "ST550" → "st550". */
export function slugifyProduct(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Builds the product slug used in Storage paths. Prefers styleCode, then name. */
export function generateProductSlug(
  styleCode?: string | null,
  name?: string | null,
): string {
  const code = styleCode?.trim();
  if (code) {
    return slugifyProduct(code);
  }
  const productName = name?.trim();
  if (productName) {
    return slugifyProduct(productName);
  }
  return "product";
}

/** Resolves brandSlug from stored value or derives from brand name. */
export function resolveBrandSlug(product: Pick<Product, "brand" | "brandSlug">): string {
  return product.brandSlug.trim() || slugifyBrand(product.brand);
}

/** Human-readable catalog label, e.g. "Sport-Tek ST550 Polo". */
export function formatProductDisplayName(
  product: Pick<Product, "brand" | "name" | "styleCode">,
): string {
  const brand = product.brand.trim();
  const name = product.name.trim();
  const styleCode = product.styleCode?.trim() ?? "";
  const lowerName = name.toLowerCase();
  const lowerBrand = brand.toLowerCase();

  if (lowerName.startsWith(lowerBrand) && (styleCode || name.length > brand.length)) {
    return name;
  }

  const parts: string[] = [brand];
  if (styleCode && !lowerName.includes(styleCode.toLowerCase())) {
    parts.push(styleCode);
  }
  if (name && lowerName !== lowerBrand && !parts.join(" ").toLowerCase().includes(lowerName)) {
    parts.push(name);
  }
  return parts.join(" ");
}

/** Unique brand names sorted alphabetically. */
export function getProductBrands(products: Product[]): string[] {
  const brands = new Set(products.map((product) => product.brand.trim()).filter(Boolean));
  return [...brands].sort((a, b) => a.localeCompare(b));
}

/** Groups products by brand name, preserving brand sort order. */
export function groupProductsByBrand(products: Product[]): Array<{
  brand: string;
  brandSlug: string;
  products: Product[];
}> {
  const brandOrder = getProductBrands(products);
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const brand = product.brand.trim();
    const list = groups.get(brand) ?? [];
    list.push(product);
    groups.set(brand, list);
  }

  return brandOrder.map((brand) => ({
    brand,
    brandSlug: resolveBrandSlug({ brand, brandSlug: groups.get(brand)?.[0]?.brandSlug ?? "" }),
    products: groups.get(brand) ?? [],
  }));
}

/** Filters products by brand name. Pass "all" to return the full list. */
export function filterProductsByBrand(products: Product[], brandFilter: string): Product[] {
  if (brandFilter === "all") {
    return products;
  }
  return products.filter((product) => product.brand.trim() === brandFilter);
}
