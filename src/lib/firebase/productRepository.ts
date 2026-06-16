import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { deleteProductImage } from "./storageRepository";
import { db, isFirebaseConfigured } from "./client";
import {
  generateProductSlug,
  slugifyBrand,
  slugifyProduct,
} from "../productSlugs";

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

import type { PreviewCalibration } from "../previewCalibration";

export type ProductColor = {
  id: string;
  name: string;
  hex: string | null;
  frontImageUrl: string | null;
  frontImageStoragePath: string | null;
  backImageUrl: string | null;
  backImageStoragePath: string | null;
  previewCalibration: PreviewCalibration | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  styleCode: string | null;
  category: string;
  description: string;
  basePriceMin: number | null;
  basePriceMax: number | null;
  previewPhysicalWidthMm: number | null;
  sizes: string[];
  colors: ProductColor[];
  isVisible: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateProductInput = {
  name: string;
  brand: string;
  styleCode?: string | null;
  category: string;
  description: string;
  basePriceMin?: number | null;
  basePriceMax?: number | null;
  sizes?: string[];
  isVisible?: boolean;
  sortOrder?: number;
};

export type UpdateProductInput = Partial<
  Pick<
    Product,
    | "name"
    | "slug"
    | "brand"
    | "brandSlug"
    | "styleCode"
    | "category"
    | "description"
    | "basePriceMin"
    | "basePriceMax"
    | "previewPhysicalWidthMm"
    | "sizes"
    | "colors"
    | "isVisible"
    | "sortOrder"
  >
>;

function getProductsCollectionRef(siteId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return collection(db, "sites", siteId, "products");
}

function getProductDocRef(siteId: string, productId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return doc(db, "sites", siteId, "products", productId);
}

function parseTimestamp(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate().toISOString();
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function slugify(value: string): string {
  return slugifyProduct(value);
}

function parsePreviewCalibration(value: unknown): PreviewCalibration | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const garmentBoundsRaw = data.garmentBounds;
  if (typeof garmentBoundsRaw !== "object" || garmentBoundsRaw === null) {
    return null;
  }

  const bounds = garmentBoundsRaw as Record<string, unknown>;
  const x = readNumber(bounds.x);
  const y = readNumber(bounds.y);
  const width = readNumber(bounds.width);
  const height = readNumber(bounds.height);
  const physicalWidthMm = readNumber(data.physicalWidthMm);

  if (
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    physicalWidthMm === null
  ) {
    return null;
  }

  const physicalHeightMm = readNumber(data.physicalHeightMm);

  return {
    garmentBounds: { x, y, width, height },
    physicalWidthMm,
    physicalHeightMm: physicalHeightMm ?? undefined,
  };
}

function parseProductColor(value: unknown): ProductColor | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const id = readString(data.id);
  const name = readString(data.name);
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    hex: readString(data.hex),
    frontImageUrl: readString(data.frontImageUrl),
    frontImageStoragePath: readString(data.frontImageStoragePath),
    backImageUrl: readString(data.backImageUrl),
    backImageStoragePath: readString(data.backImageStoragePath),
    previewCalibration: parsePreviewCalibration(data.previewCalibration) ?? null,
  };
}

function parseProduct(id: string, data: DocumentData): Product | null {
  const name = readString(data.name);
  const slug = readString(data.slug);
  const brand = readString(data.brand);
  const category = readString(data.category);
  const description = readString(data.description);

  if (!name || !slug || !brand || !category || !description) {
    return null;
  }

  const sizes = Array.isArray(data.sizes)
    ? data.sizes.filter((size): size is string => typeof size === "string")
    : [];

  const colors = Array.isArray(data.colors)
    ? data.colors
        .map((color) => parseProductColor(color))
        .filter((color): color is ProductColor => color !== null)
    : [];

  return {
    id,
    name,
    slug,
    brand,
    brandSlug: readString(data.brandSlug) ?? slugifyBrand(brand),
    styleCode: readString(data.styleCode) ?? readString(data.modelNumber),
    category,
    description,
    basePriceMin: readNumber(data.basePriceMin),
    basePriceMax: readNumber(data.basePriceMax),
    previewPhysicalWidthMm: readNumber(data.previewPhysicalWidthMm),
    sizes,
    colors,
    isVisible: readBoolean(data.isVisible, true),
    sortOrder: readNumber(data.sortOrder) ?? 0,
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

function parseSizesInput(value: string): string[] {
  return value
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);
}

/** Lists all products for admin, sorted by sortOrder. */
export async function listProducts(siteId: string): Promise<Product[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const itemsQuery = query(getProductsCollectionRef(siteId), orderBy("sortOrder", "asc"));
    const snapshot = await getDocs(itemsQuery);
    return snapshot.docs
      .map((itemDoc) => parseProduct(itemDoc.id, itemDoc.data()))
      .filter((item): item is Product => item !== null);
  } catch {
    return [];
  }
}

/** Lists visible products for the public catalog. */
export async function listVisibleProducts(siteId: string): Promise<Product[]> {
  const products = await listProducts(siteId);
  return products.filter((product) => product.isVisible);
}

/** Loads a single product by id. */
export async function getProduct(
  siteId: string,
  productId: string,
): Promise<Product | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const snapshot = await getDoc(getProductDocRef(siteId, productId));
    if (!snapshot.exists()) {
      return null;
    }
    return parseProduct(snapshot.id, snapshot.data());
  } catch {
    return null;
  }
}

/** Creates a product at sites/{siteId}/products/{productId}. */
export async function createProduct(
  siteId: string,
  input: CreateProductInput,
): Promise<Product> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Product name is required.");
  }

  const brand = input.brand.trim();
  const styleCode = input.styleCode?.trim() || null;
  const brandSlug = slugifyBrand(brand);
  const slug = generateProductSlug(styleCode, name);

  const docRef = doc(getProductsCollectionRef(siteId));

  await setDoc(docRef, {
    id: docRef.id,
    name,
    slug,
    brand,
    brandSlug,
    styleCode,
    category: input.category.trim(),
    description: input.description.trim(),
    basePriceMin: input.basePriceMin ?? null,
    basePriceMax: input.basePriceMax ?? null,
    sizes: input.sizes ?? [],
    colors: [],
    isVisible: input.isVisible ?? true,
    sortOrder: input.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const saved = await getDoc(docRef);
  const parsed = saved.exists() ? parseProduct(saved.id, saved.data()) : null;
  if (!parsed) {
    throw new Error("Product was saved but could not be read back.");
  }
  return parsed;
}

/** Updates product metadata at sites/{siteId}/products/{productId}. */
export async function updateProduct(
  siteId: string,
  productId: string,
  updates: UpdateProductInput,
): Promise<Product> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const docRef = getProductDocRef(siteId, productId);
  const existing = await getProduct(siteId, productId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  let nextName = existing?.name ?? "";
  let nextBrand = existing?.brand ?? "";
  let nextStyleCode = existing?.styleCode ?? null;

  if (updates.name !== undefined) {
    nextName = updates.name.trim();
    payload.name = nextName;
  }
  if (updates.slug !== undefined) {
    payload.slug = slugify(updates.slug);
  }
  if (updates.brand !== undefined) {
    nextBrand = updates.brand.trim();
    payload.brand = nextBrand;
    payload.brandSlug = slugifyBrand(nextBrand);
  }
  if (updates.brandSlug !== undefined) {
    payload.brandSlug = updates.brandSlug.trim();
  }
  if (updates.styleCode !== undefined) {
    nextStyleCode = updates.styleCode?.trim() || null;
    payload.styleCode = nextStyleCode;
  }
  if (updates.category !== undefined) {
    payload.category = updates.category.trim();
  }
  if (updates.description !== undefined) {
    payload.description = updates.description.trim();
  }
  if (updates.basePriceMin !== undefined) {
    payload.basePriceMin = updates.basePriceMin;
  }
  if (updates.basePriceMax !== undefined) {
    payload.basePriceMax = updates.basePriceMax;
  }
  if (updates.previewPhysicalWidthMm !== undefined) {
    payload.previewPhysicalWidthMm = updates.previewPhysicalWidthMm;
  }
  if (updates.sizes !== undefined) {
    payload.sizes = updates.sizes;
  }
  if (updates.colors !== undefined) {
    payload.colors = updates.colors;
  }
  if (updates.isVisible !== undefined) {
    payload.isVisible = updates.isVisible;
  }
  if (updates.sortOrder !== undefined) {
    payload.sortOrder = updates.sortOrder;
  }

  if (
    updates.slug === undefined &&
    (updates.name !== undefined ||
      updates.styleCode !== undefined ||
      updates.brand !== undefined)
  ) {
    payload.slug = generateProductSlug(nextStyleCode, nextName);
  }

  await updateDoc(docRef, payload);

  const saved = await getDoc(docRef);
  const parsed = saved.exists() ? parseProduct(saved.id, saved.data()) : null;
  if (!parsed) {
    throw new Error("Product was updated but could not be read back.");
  }
  return parsed;
}

/** Deletes a product and its Storage images when present. */
export async function deleteProduct(siteId: string, productId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const product = await getProduct(siteId, productId);
  if (!product) {
    return;
  }

  for (const color of product.colors) {
    if (color.frontImageStoragePath) {
      try {
        await deleteProductImage(color.frontImageStoragePath);
      } catch {
        // Best-effort cleanup.
      }
    }
    if (color.backImageStoragePath) {
      try {
        await deleteProductImage(color.backImageStoragePath);
      } catch {
        // Best-effort cleanup.
      }
    }
  }

  await deleteDoc(getProductDocRef(siteId, productId));
}

export function parseSizesFromForm(value: string): string[] {
  return parseSizesInput(value);
}

export function formatPriceRange(
  min: number | null,
  max: number | null,
): string | null {
  if (min !== null && max !== null) {
    return `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  }
  if (min !== null) {
    return `From $${min.toFixed(2)}`;
  }
  if (max !== null) {
    return `Up to $${max.toFixed(2)}`;
  }
  return null;
}

export function getProductCoverImageUrl(product: Product): string | null {
  const firstColorWithImage = product.colors.find((color) => color.frontImageUrl);
  return firstColorWithImage?.frontImageUrl ?? null;
}
