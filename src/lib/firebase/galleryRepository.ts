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
import { deleteGalleryImage } from "./storageRepository";
import { db, isFirebaseConfigured } from "./client";

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

export const GALLERY_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const GALLERY_ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type GalleryContentType = (typeof GALLERY_ALLOWED_CONTENT_TYPES)[number];

export type GalleryItem = {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  storagePath: string;
  createdAt: string | null;
  updatedAt: string | null;
  isVisible: boolean;
  sortOrder: number;
};

export type CreateGalleryItemInput = {
  title: string;
  category: string;
  imageUrl: string;
  storagePath: string;
  isVisible?: boolean;
  sortOrder?: number;
};

export type UpdateGalleryItemInput = Partial<
  Pick<GalleryItem, "title" | "category" | "imageUrl" | "storagePath" | "isVisible" | "sortOrder">
>;

function getGalleryCollectionRef(siteId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return collection(db, "sites", siteId, "gallery");
}

function getGalleryDocRef(siteId: string, galleryItemId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return doc(db, "sites", siteId, "gallery", galleryItemId);
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

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function parseGalleryItem(id: string, data: DocumentData): GalleryItem | null {
  const title = readString(data.title);
  const category = readString(data.category);
  const imageUrl = readString(data.imageUrl);
  const storagePath = readString(data.storagePath);

  if (!title || !category || !imageUrl || !storagePath) {
    return null;
  }

  return {
    id,
    title,
    category,
    imageUrl,
    storagePath,
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
    isVisible: readBoolean(data.isVisible, true),
    sortOrder: readNumber(data.sortOrder, 0),
  };
}

export function validateGalleryUploadFile(file: File): string | null {
  if (
    !GALLERY_ALLOWED_CONTENT_TYPES.includes(file.type as GalleryContentType)
  ) {
    return "Only PNG, JPG, and WebP images are allowed.";
  }

  if (file.size > GALLERY_MAX_FILE_SIZE_BYTES) {
    return "Image must be 10MB or smaller.";
  }

  return null;
}

/** Lists gallery metadata from sites/{siteId}/gallery/{galleryItemId}. */
export async function listGalleryItems(siteId: string): Promise<GalleryItem[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const itemsQuery = query(
      getGalleryCollectionRef(siteId),
      orderBy("sortOrder", "asc"),
    );
    const snapshot = await getDocs(itemsQuery);

    return snapshot.docs
      .map((itemDoc) => parseGalleryItem(itemDoc.id, itemDoc.data()))
      .filter((item): item is GalleryItem => item !== null);
  } catch {
    return [];
  }
}

/** Creates gallery metadata at sites/{siteId}/gallery/{galleryItemId}. */
export async function createGalleryItem(
  siteId: string,
  input: CreateGalleryItemInput,
): Promise<GalleryItem> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const docRef = doc(getGalleryCollectionRef(siteId));
  const sortOrder = input.sortOrder ?? Date.now();

  await setDoc(docRef, {
    id: docRef.id,
    title: input.title.trim(),
    category: input.category.trim(),
    imageUrl: input.imageUrl,
    storagePath: input.storagePath,
    isVisible: input.isVisible ?? true,
    sortOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const saved = await getDoc(docRef);
  const parsed = saved.exists()
    ? parseGalleryItem(saved.id, saved.data())
    : null;

  if (!parsed) {
    throw new Error("Gallery item was saved but could not be read back.");
  }

  return parsed;
}

/** Updates gallery metadata at sites/{siteId}/gallery/{galleryItemId}. */
export async function updateGalleryItem(
  siteId: string,
  itemId: string,
  updates: UpdateGalleryItemInput,
): Promise<GalleryItem> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const docRef = getGalleryDocRef(siteId, itemId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.title !== undefined) {
    payload.title = updates.title.trim();
  }
  if (updates.category !== undefined) {
    payload.category = updates.category.trim();
  }
  if (updates.imageUrl !== undefined) {
    payload.imageUrl = updates.imageUrl;
  }
  if (updates.storagePath !== undefined) {
    payload.storagePath = updates.storagePath;
  }
  if (updates.isVisible !== undefined) {
    payload.isVisible = updates.isVisible;
  }
  if (updates.sortOrder !== undefined) {
    payload.sortOrder = updates.sortOrder;
  }

  await updateDoc(docRef, payload);

  const saved = await getDoc(docRef);
  const parsed = saved.exists()
    ? parseGalleryItem(saved.id, saved.data())
    : null;

  if (!parsed) {
    throw new Error("Gallery item was updated but could not be read back.");
  }

  return parsed;
}

/** Deletes gallery metadata and the Storage object when present. */
export async function deleteGalleryItem(
  siteId: string,
  itemId: string,
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const docRef = getGalleryDocRef(siteId, itemId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return;
  }

  const storagePath = readString(snapshot.data().storagePath);
  if (storagePath) {
    try {
      await deleteGalleryImage(storagePath);
    } catch {
      // Continue deleting metadata even if the Storage object is already gone.
    }
  }

  await deleteDoc(docRef);
}
