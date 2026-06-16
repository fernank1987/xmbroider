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
import { removeUndefinedDeep } from "./firestoreUtils";
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
  sortOrder: number;
  isVisible: boolean;
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
  seoDescription: string | null;
  material: string | null;
  fabricWeight: string | null;
  fit: string | null;
  careInstructions: string | null;
  decorationMethods: string[];
  features: string[];
  basePriceMin: number | null;
  basePriceMax: number | null;
  previewPhysicalWidthMm: number | null;
  defaultPreviewCalibration: PreviewCalibration | null;
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
  seoDescription?: string | null;
  material?: string | null;
  fabricWeight?: string | null;
  fit?: string | null;
  careInstructions?: string | null;
  decorationMethods?: string[];
  features?: string[];
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
    | "seoDescription"
    | "material"
    | "fabricWeight"
    | "fit"
    | "careInstructions"
    | "decorationMethods"
    | "features"
    | "basePriceMin"
    | "basePriceMax"
    | "previewPhysicalWidthMm"
    | "defaultPreviewCalibration"
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

  const calibration: PreviewCalibration = {
    garmentBounds: { x, y, width, height },
    physicalWidthMm,
  };
  if (physicalHeightMm !== null) {
    calibration.physicalHeightMm = physicalHeightMm;
  }
  return calibration;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
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
    sortOrder: readNumber(data.sortOrder) ?? 0,
    isVisible: readBoolean(data.isVisible, true),
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
    seoDescription: readString(data.seoDescription),
    material: readString(data.material),
    fabricWeight: readString(data.fabricWeight),
    fit: readString(data.fit),
    careInstructions: readString(data.careInstructions),
    decorationMethods: readStringArray(data.decorationMethods),
    features: readStringArray(data.features),
    basePriceMin: readNumber(data.basePriceMin),
    basePriceMax: readNumber(data.basePriceMax),
    previewPhysicalWidthMm: readNumber(data.previewPhysicalWidthMm),
    defaultPreviewCalibration:
      parsePreviewCalibration(data.defaultPreviewCalibration) ?? null,
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

function serializePreviewCalibrationForWrite(
  calibration: PreviewCalibration,
): Record<string, unknown> {
  const record: Record<string, unknown> = {
    garmentBounds: {
      x: calibration.garmentBounds.x,
      y: calibration.garmentBounds.y,
      width: calibration.garmentBounds.width,
      height: calibration.garmentBounds.height,
    },
    physicalWidthMm: calibration.physicalWidthMm,
  };
  if (typeof calibration.physicalHeightMm === "number") {
    record.physicalHeightMm = calibration.physicalHeightMm;
  }
  return record;
}

function serializeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeProductColorForWrite(color: ProductColor): Record<string, unknown> {
  const record: Record<string, unknown> = {
    id: color.id,
    name: color.name.trim(),
    sortOrder: color.sortOrder,
    isVisible: color.isVisible,
  };

  const hex = serializeOptionalString(color.hex);
  if (hex) {
    record.hex = hex;
  }
  if (typeof color.frontImageUrl === "string" && color.frontImageUrl.length > 0) {
    record.frontImageUrl = color.frontImageUrl;
  }
  if (typeof color.frontImageStoragePath === "string" && color.frontImageStoragePath.length > 0) {
    record.frontImageStoragePath = color.frontImageStoragePath;
  }
  if (typeof color.backImageUrl === "string" && color.backImageUrl.length > 0) {
    record.backImageUrl = color.backImageUrl;
  }
  if (typeof color.backImageStoragePath === "string" && color.backImageStoragePath.length > 0) {
    record.backImageStoragePath = color.backImageStoragePath;
  }
  if (color.previewCalibration) {
    record.previewCalibration = serializePreviewCalibrationForWrite(color.previewCalibration);
  }

  return removeUndefinedDeep(record, { path: `colors.${color.id}` }) as Record<string, unknown>;
}

function serializeOptionalProductString(value: string | null | undefined): string | null {
  return serializeOptionalString(value);
}

function serializeStringArrayForWrite(items: string[] | undefined): string[] {
  if (!items) {
    return [];
  }
  return items.map((item) => item.trim()).filter(Boolean);
}

function summarizeProductWritePayload(payload: Record<string, unknown>): {
  keys: string[];
  specFields: Record<string, unknown>;
} {
  const keys: string[] = [];
  const specFields: Record<string, unknown> = {};
  const specKeys = new Set([
    "material",
    "fabricWeight",
    "fit",
    "careInstructions",
    "decorationMethods",
    "features",
    "seoDescription",
  ]);

  for (const [key, value] of Object.entries(payload)) {
    keys.push(key);
    if (specKeys.has(key)) {
      specFields[key] = value;
      continue;
    }
    if (key === "colors" && Array.isArray(value)) {
      keys[keys.length - 1] = `colors[${value.length}]`;
    }
  }

  return { keys, specFields };
}

function logProductWritePayload(action: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    const { keys, specFields } = summarizeProductWritePayload(payload);
    console.log(`[productRepository] ${action} payload keys:`, keys);
    console.log(`[productRepository] ${action} spec fields:`, specFields);
  }
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

  const writePayload = removeUndefinedDeep({
    id: docRef.id,
    name,
    slug,
    brand,
    brandSlug,
    styleCode,
    category: input.category.trim(),
    description: input.description.trim(),
    seoDescription: serializeOptionalProductString(input.seoDescription),
    material: serializeOptionalProductString(input.material),
    fabricWeight: serializeOptionalProductString(input.fabricWeight),
    fit: serializeOptionalProductString(input.fit),
    careInstructions: serializeOptionalProductString(input.careInstructions),
    decorationMethods: serializeStringArrayForWrite(input.decorationMethods),
    features: serializeStringArrayForWrite(input.features),
    basePriceMin: input.basePriceMin ?? null,
    basePriceMax: input.basePriceMax ?? null,
    sizes: input.sizes ?? [],
    colors: [],
    isVisible: input.isVisible ?? true,
    sortOrder: input.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  logProductWritePayload("createProduct", writePayload as Record<string, unknown>);
  await setDoc(docRef, writePayload);

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
  if (updates.seoDescription !== undefined) {
    payload.seoDescription = serializeOptionalProductString(updates.seoDescription);
  }
  if (updates.material !== undefined) {
    payload.material = serializeOptionalProductString(updates.material);
  }
  if (updates.fabricWeight !== undefined) {
    payload.fabricWeight = serializeOptionalProductString(updates.fabricWeight);
  }
  if (updates.fit !== undefined) {
    payload.fit = serializeOptionalProductString(updates.fit);
  }
  if (updates.careInstructions !== undefined) {
    payload.careInstructions = serializeOptionalProductString(updates.careInstructions);
  }
  if (updates.decorationMethods !== undefined) {
    payload.decorationMethods = serializeStringArrayForWrite(updates.decorationMethods);
  }
  if (updates.features !== undefined) {
    payload.features = serializeStringArrayForWrite(updates.features);
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
  if (updates.defaultPreviewCalibration !== undefined) {
    payload.defaultPreviewCalibration = updates.defaultPreviewCalibration
      ? serializePreviewCalibrationForWrite(updates.defaultPreviewCalibration)
      : null;
  }
  if (updates.sizes !== undefined) {
    payload.sizes = updates.sizes;
  }
  if (updates.colors !== undefined) {
    payload.colors = updates.colors.map(serializeProductColorForWrite);
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

  const sanitizedPayload = removeUndefinedDeep(payload, { path: `products.${productId}` });
  logProductWritePayload("updateProduct", sanitizedPayload as Record<string, unknown>);

  try {
    await updateDoc(docRef, sanitizedPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore error";
    throw new Error(`Unable to save product: ${message}`);
  }

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

/** Builds a new color object with only defined Firestore-safe fields in app state. */
export function createProductColorInput(name: string, hex?: string | null): ProductColor {
  const trimmedName = name.trim();
  const trimmedHex = hex?.trim();
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: trimmedName,
    hex: trimmedHex || null,
    sortOrder: Date.now(),
    isVisible: true,
    frontImageUrl: null,
    frontImageStoragePath: null,
    backImageUrl: null,
    backImageStoragePath: null,
    previewCalibration: null,
  };
}

/** Colors visible on public catalog and preview (defaults to visible). */
export function getVisibleProductColors(product: Product): ProductColor[] {
  return product.colors.filter((color) => color.isVisible);
}

export function getProductCoverImageUrl(product: Product): string | null {
  const firstColorWithImage = getVisibleProductColors(product).find(
    (color) => color.frontImageUrl,
  );
  return firstColorWithImage?.frontImageUrl ?? null;
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
