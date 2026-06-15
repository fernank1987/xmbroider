"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createGalleryItem,
  deleteGalleryItem,
  listGalleryItems,
  updateGalleryItem,
  validateGalleryUploadFile,
  type GalleryItem,
} from "@/lib/firebase/galleryRepository";
import { uploadGalleryImage } from "@/lib/firebase/storageRepository";
import { siteContent } from "@/lib/siteContent";
import {
  adminBodyText,
  adminButtonDisabled,
  adminCard,
  adminCardValue,
  adminGalleryThumb,
  adminGalleryThumbIcon,
  adminInput,
  adminLabel,
  adminNotice,
  adminSectionTitle,
} from "../lib/adminStyles";

const SITE_ID = siteContent.siteId;

type FallbackGalleryItem = {
  id: string;
  title: string;
  category: string;
  isFallback: true;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function AdminGalleryEditor() {
  const fallbackItems = useMemo<FallbackGalleryItem[]>(
    () =>
      siteContent.gallery.items.map((item) => ({
        id: item.id,
        title: item.label,
        category: item.category,
        isFallback: true as const,
      })),
    [],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const firestoreItems = await listGalleryItems(SITE_ID);
        if (!cancelled) {
          setItems(firestoreItems);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load gallery items."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setStatusMessage(null);
    setErrorMessage(null);

    if (!file) {
      return;
    }

    const validationError = validateGalleryUploadFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      event.target.value = "";
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!selectedFile) {
      setErrorMessage("Choose an image file to upload.");
      return;
    }

    if (!title.trim() || !category.trim()) {
      setErrorMessage("Title and category are required.");
      return;
    }

    const validationError = validateGalleryUploadFile(selectedFile);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setUploading(true);

    try {
      const upload = await uploadGalleryImage(
        SITE_ID,
        selectedFile,
        selectedFile.type,
      );

      const created = await createGalleryItem(SITE_ID, {
        title: title.trim(),
        category: category.trim(),
        imageUrl: upload.url,
        storagePath: upload.path,
        isVisible: true,
        sortOrder: Date.now(),
      });

      setItems((current) =>
        [...current, created].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setTitle("");
      setCategory("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatusMessage("Gallery image uploaded.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to upload gallery image."));
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVisible = async (item: GalleryItem) => {
    setBusyItemId(item.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateGalleryItem(SITE_ID, item.id, {
        isVisible: !item.isVisible,
      });
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setStatusMessage(
        updated.isVisible ? "Gallery item is now visible." : "Gallery item hidden.",
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to update gallery item."));
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    setBusyItemId(item.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await deleteGalleryItem(SITE_ID, item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setStatusMessage("Gallery item deleted.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to delete gallery item."));
    } finally {
      setBusyItemId(null);
    }
  };

  const showingFallback = !loading && items.length === 0;

  return (
    <div className="flex-1 space-y-8 p-6 lg:p-8">
      <div className={adminNotice}>
        Gallery images upload to Firebase Storage at{" "}
        <code className="text-xs">sites/{SITE_ID}/gallery/</code> and metadata
        saves to Firestore at{" "}
        <code className="text-xs">sites/{SITE_ID}/gallery/{"{galleryItemId}"}</code>.
        The public homepage still uses fallback content until connected.
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 admin-dark:border-red-500/30 admin-dark:bg-red-500/10 admin-dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 admin-dark:border-emerald-500/30 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      <section className={`${adminCard} p-6`}>
        <h2 className={adminSectionTitle}>Upload gallery image</h2>
        <p className={`mt-2 text-sm ${adminBodyText}`}>
          Allowed formats: PNG, JPG, WebP. Maximum size: 10MB.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleUpload}>
          <div>
            <label htmlFor="gallery-file" className={adminLabel}>
              Image file
            </label>
            <input
              ref={fileInputRef}
              id="gallery-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className={adminInput}
            />
            {selectedFile && (
              <p className={`mt-2 text-xs ${adminBodyText}`}>
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gallery-title" className={adminLabel}>
                Title
              </label>
              <input
                id="gallery-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Embroidered Polo"
                disabled={uploading}
                className={adminInput}
              />
            </div>
            <div>
              <label htmlFor="gallery-category" className={adminLabel}>
                Category
              </label>
              <input
                id="gallery-category"
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Embroidery"
                disabled={uploading}
                className={adminInput}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className={
              uploading
                ? adminButtonDisabled
                : "rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 admin-dark:bg-amber-600 admin-dark:hover:bg-amber-500"
            }
          >
            {uploading ? "Uploading…" : "Upload to gallery"}
          </button>
        </form>
      </section>

      <section>
        <h2 className={`mb-4 ${adminSectionTitle}`}>
          {showingFallback
            ? `Fallback gallery placeholders (${fallbackItems.length})`
            : `Gallery items (${items.length})`}
        </h2>

        {loading ? (
          <div className={`${adminCard} px-8 py-10 text-center`}>
            <p className={adminBodyText}>Loading gallery items…</p>
          </div>
        ) : showingFallback ? (
          <>
            <p className={`mb-4 text-sm ${adminBodyText}`}>
              No Firestore gallery items yet. Showing placeholders from{" "}
              <code className="text-xs">siteContent.ts</code>.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {fallbackItems.map((item) => (
                <article key={item.id} className={`${adminCard} p-4`}>
                  <div className={adminGalleryThumb}>
                    <svg
                      className={adminGalleryThumbIcon}
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
                  </div>
                  <h3 className={`mt-3 text-sm font-medium ${adminCardValue}`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs ${adminBodyText}`}>{item.category}</p>
                  <p className="mt-2 text-xs text-amber-700 admin-dark:text-amber-300">
                    Fallback placeholder
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className={`${adminCard} p-4`}>
                <div className={`${adminGalleryThumb} overflow-hidden`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className={`mt-3 text-sm font-medium ${adminCardValue}`}>
                  {item.title}
                </h3>
                <p className={`text-xs ${adminBodyText}`}>{item.category}</p>
                <p className="mt-2 text-xs text-slate-500 admin-dark:text-zinc-500">
                  {item.isVisible ? "Visible" : "Hidden"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => void handleToggleVisible(item)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 admin-dark:border-zinc-700 admin-dark:text-zinc-200 admin-dark:hover:bg-zinc-800"
                  >
                    {item.isVisible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => void handleDelete(item)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 admin-dark:border-red-500/40 admin-dark:text-red-300 admin-dark:hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
