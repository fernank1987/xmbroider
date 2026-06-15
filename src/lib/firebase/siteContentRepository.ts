import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { unstable_noStore as noStore } from "next/cache";
import {
  getFallbackEditableContent,
  getSiteContent,
  siteContent,
  type EditableSiteContent,
  type SiteBrand,
  type SiteContent,
} from "@/lib/siteContent";
import { deleteBrandLogo } from "./storageRepository";
import { db, isFirebaseConfigured } from "./client";

const FIREBASE_DISABLED_MESSAGE =
  "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local.";

function getSiteDocRef(siteId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return doc(db, "sites", siteId);
}

function getSiteContentDocRef(siteId: string) {
  if (!db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }
  return doc(db, "sites", siteId, "content", "main");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseEditableSiteContent(data: DocumentData): EditableSiteContent | null {
  if (!isRecord(data.brand) || !isRecord(data.hero) || !isRecord(data.seo)) {
    return null;
  }

  const brand = data.brand;
  const hero = data.hero;
  const seo = data.seo;

  const name = readString(brand.name);
  const tagline = readString(brand.tagline);
  const phone = readString(brand.phone);
  const email = readString(brand.email);
  const location = readString(brand.location);
  const heroTitle = readString(hero.title);
  const heroSubtitle = readString(hero.subtitle);
  const seoTitle = readString(seo.title);
  const seoDescription = readString(seo.description);

  if (
    !name ||
    !tagline ||
    !phone ||
    !email ||
    !location ||
    !heroTitle ||
    !heroSubtitle ||
    !seoTitle ||
    !seoDescription
  ) {
    return null;
  }

  const parsedBrand: EditableSiteContent["brand"] = {
    name,
    tagline,
    phone,
    email,
    location,
  };

  const logoUrl = readString(brand.logoUrl);
  const logoStoragePath = readString(brand.logoStoragePath);
  const logoAlt = readString(brand.logoAlt);

  if (logoUrl) {
    parsedBrand.logoUrl = logoUrl;
  }
  if (logoStoragePath) {
    parsedBrand.logoStoragePath = logoStoragePath;
  }
  if (logoAlt !== null) {
    parsedBrand.logoAlt = logoAlt;
  }

  return {
    brand: parsedBrand,
    hero: { title: heroTitle, subtitle: heroSubtitle },
    seo: { title: seoTitle, description: seoDescription },
  };
}

function mergeEditableIntoSiteContent(
  fallback: SiteContent,
  editable: EditableSiteContent,
): SiteContent {
  return {
    ...fallback,
    brand: { ...editable.brand },
    hero: {
      ...fallback.hero,
      title: editable.hero.title,
      subtitle: editable.hero.subtitle,
    },
    seo: { ...editable.seo },
  };
}

function buildBrandWritePayload(
  brand: SiteBrand,
  options?: { clearLogo?: boolean },
): Record<string, unknown> {
  const base = {
    name: brand.name,
    tagline: brand.tagline,
    phone: brand.phone,
    email: brand.email,
    location: brand.location,
  };

  if (options?.clearLogo) {
    return {
      ...base,
      logoAlt: brand.name,
      logoUrl: deleteField(),
      logoStoragePath: deleteField(),
    };
  }

  const payload: Record<string, unknown> = { ...base };

  if (brand.logoUrl) {
    payload.logoUrl = brand.logoUrl;
  }
  if (brand.logoStoragePath) {
    payload.logoStoragePath = brand.logoStoragePath;
  }
  if (brand.logoAlt !== undefined) {
    payload.logoAlt = brand.logoAlt;
  }

  return payload;
}

function buildBrandWithoutLogo(brand: SiteBrand): SiteBrand {
  return {
    name: brand.name,
    tagline: brand.tagline,
    phone: brand.phone,
    email: brand.email,
    location: brand.location,
    logoAlt: brand.name,
  };
}

/**
 * Loads site content from Firestore at sites/{siteId}/content/main.
 * Returns merged content when a document exists, otherwise null.
 */
export async function getSiteContentFromFirestore(
  siteId: string,
): Promise<SiteContent | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const snapshot = await getDoc(getSiteContentDocRef(siteId));
    if (!snapshot.exists()) {
      return null;
    }

    const editable = parseEditableSiteContent(snapshot.data());
    if (!editable) {
      return null;
    }

    return mergeEditableIntoSiteContent(getSiteContent(siteId), editable);
  } catch {
    return null;
  }
}

/**
 * Loads public homepage content from Firestore when available, otherwise fallback.
 *
 * Reads sites/{siteId}/content/main using the fallback siteId, merges editable
 * Firestore fields into local siteContent, and always returns usable content.
 */
export async function loadPublicSiteContent(
  siteId: string = siteContent.siteId,
): Promise<SiteContent> {
  noStore();

  const fallback = getSiteContent(siteId);
  const firestoreContent = await getSiteContentFromFirestore(siteId);
  return firestoreContent ?? fallback;
}

/** Loads only the editable Firestore fields, or null when missing/invalid. */
export async function getEditableSiteContentFromFirestore(
  siteId: string,
): Promise<EditableSiteContent | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }

  try {
    const snapshot = await getDoc(getSiteContentDocRef(siteId));
    if (!snapshot.exists()) {
      return null;
    }

    return parseEditableSiteContent(snapshot.data());
  } catch {
    return null;
  }
}

/**
 * Persists editable site content to Firestore.
 *
 * - Parent site summary: sites/{siteId}
 * - Editable content: sites/{siteId}/content/main
 */
export async function saveSiteContentToFirestore(
  siteId: string,
  content: EditableSiteContent,
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const contentRef = getSiteContentDocRef(siteId);
  const siteRef = getSiteDocRef(siteId);

  const [existingContent, existingSite] = await Promise.all([
    getDoc(contentRef),
    getDoc(siteRef),
  ]);

  const isFirstContentSave = !existingContent.exists();
  const isFirstSiteSave = !existingSite.exists();

  await Promise.all([
    setDoc(
      contentRef,
      {
        siteId,
        brand: buildBrandWritePayload(content.brand),
        hero: content.hero,
        seo: content.seo,
        updatedAt: serverTimestamp(),
        ...(isFirstContentSave ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true },
    ),
    setDoc(
      siteRef,
      {
        siteId,
        businessName: content.brand.name,
        tagline: content.brand.tagline,
        updatedAt: serverTimestamp(),
        ...(isFirstSiteSave ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true },
    ),
  ]);
}

/**
 * Removes the brand logo from Firestore and deletes the Storage object when present.
 */
export async function removeBrandLogoFromFirestore(
  siteId: string,
  content: EditableSiteContent,
): Promise<EditableSiteContent> {
  if (!isFirebaseConfigured || !db) {
    throw new Error(FIREBASE_DISABLED_MESSAGE);
  }

  const storagePath = content.brand.logoStoragePath;
  if (storagePath) {
    try {
      await deleteBrandLogo(storagePath);
    } catch {
      // Best-effort cleanup when removing a logo.
    }
  }

  const updatedContent: EditableSiteContent = {
    ...content,
    brand: buildBrandWithoutLogo(content.brand),
  };

  const contentRef = getSiteContentDocRef(siteId);
  const siteRef = getSiteDocRef(siteId);

  await Promise.all([
    setDoc(
      contentRef,
      {
        siteId,
        brand: buildBrandWritePayload(content.brand, { clearLogo: true }),
        hero: content.hero,
        seo: content.seo,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      siteRef,
      {
        siteId,
        businessName: content.brand.name,
        tagline: content.brand.tagline,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ]);

  return updatedContent;
}

export function getFallbackEditableSiteContent(
  siteId: string = siteContent.siteId,
): EditableSiteContent {
  return getFallbackEditableContent(siteId);
}
