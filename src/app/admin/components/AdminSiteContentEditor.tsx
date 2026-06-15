"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEditableSiteContentFromFirestore,
  getFallbackEditableSiteContent,
  saveSiteContentToFirestore,
} from "@/lib/firebase/siteContentRepository";
import { siteContent, type EditableSiteContent } from "@/lib/siteContent";
import {
  adminBodyText,
  adminButtonDisabled,
  adminCard,
  adminInput,
  adminLabel,
  adminNotice,
  adminSectionTitle,
} from "../lib/adminStyles";

const SITE_ID = siteContent.siteId;

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to save site content. Please try again.";
}

export default function AdminSiteContentEditor() {
  const fallbackContent = useMemo(
    () => getFallbackEditableSiteContent(SITE_ID),
    [],
  );
  const [form, setForm] = useState<EditableSiteContent>(fallbackContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"fallback" | "firestore">("fallback");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const firestoreContent = await getEditableSiteContentFromFirestore(SITE_ID);
        if (cancelled) {
          return;
        }

        if (firestoreContent) {
          setForm(firestoreContent);
          setSource("firestore");
        } else {
          setForm(fallbackContent);
          setSource("fallback");
        }
      } catch {
        if (!cancelled) {
          setForm(fallbackContent);
          setSource("fallback");
          setErrorMessage("Could not load Firestore content. Showing fallback values.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [fallbackContent]);

  const updateField = useCallback(
    (section: keyof EditableSiteContent, field: string, value: string) => {
      setForm((current) => {
        if (section === "brand") {
          return {
            ...current,
            brand: {
              ...current.brand,
              [field]: value,
            },
          };
        }

        if (section === "hero") {
          return {
            ...current,
            hero: {
              ...current.hero,
              [field]: value,
            },
          };
        }

        return {
          ...current,
          seo: {
            ...current.seo,
            [field]: value,
          },
        };
      });
      setStatusMessage(null);
      setErrorMessage(null);
    },
    [],
  );

  const handleReset = () => {
    setForm(getFallbackEditableSiteContent(SITE_ID));
    setSource("fallback");
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await saveSiteContentToFirestore(SITE_ID, form);
      setSource("firestore");
      setStatusMessage("Saved");
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className={`${adminNotice} mb-6`}>
        Site content saves to Firestore at{" "}
        <code className="text-xs">sites/{SITE_ID}/content/main</code>. The public
        homepage still uses fallback content until public Firestore loading is
        connected.
      </div>

      {loading ? (
        <div className={`${adminCard} px-8 py-10 text-center`}>
          <p className={adminBodyText}>Loading site content…</p>
        </div>
      ) : (
        <>
          <p className={`mb-6 text-sm ${adminBodyText}`}>
            Current form source:{" "}
            <span className="font-medium text-slate-900 admin-dark:text-white">
              {source === "firestore" ? "Firestore" : "Fallback content"}
            </span>
          </p>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 admin-dark:border-red-500/30 admin-dark:bg-red-500/10 admin-dark:text-red-200">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 admin-dark:border-emerald-500/30 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-200">
              {statusMessage}
            </div>
          )}

          <form className="max-w-3xl space-y-8" onSubmit={handleSubmit}>
            <section className={`${adminCard} space-y-4 p-6`}>
              <h2 className={adminSectionTitle}>Brand</h2>

              <div>
                <label htmlFor="brand-name" className={adminLabel}>
                  Brand name
                </label>
                <input
                  id="brand-name"
                  type="text"
                  value={form.brand.name}
                  onChange={(event) =>
                    updateField("brand", "name", event.target.value)
                  }
                  className={adminInput}
                />
              </div>

              <div>
                <label htmlFor="brand-tagline" className={adminLabel}>
                  Tagline
                </label>
                <input
                  id="brand-tagline"
                  type="text"
                  value={form.brand.tagline}
                  onChange={(event) =>
                    updateField("brand", "tagline", event.target.value)
                  }
                  className={adminInput}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="brand-phone" className={adminLabel}>
                    Phone
                  </label>
                  <input
                    id="brand-phone"
                    type="tel"
                    value={form.brand.phone}
                    onChange={(event) =>
                      updateField("brand", "phone", event.target.value)
                    }
                    className={adminInput}
                  />
                </div>
                <div>
                  <label htmlFor="brand-email" className={adminLabel}>
                    Email
                  </label>
                  <input
                    id="brand-email"
                    type="email"
                    value={form.brand.email}
                    onChange={(event) =>
                      updateField("brand", "email", event.target.value)
                    }
                    className={adminInput}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="brand-location" className={adminLabel}>
                  Location
                </label>
                <input
                  id="brand-location"
                  type="text"
                  value={form.brand.location}
                  onChange={(event) =>
                    updateField("brand", "location", event.target.value)
                  }
                  className={adminInput}
                />
              </div>
            </section>

            <section className={`${adminCard} space-y-4 p-6`}>
              <h2 className={adminSectionTitle}>Hero</h2>

              <div>
                <label htmlFor="hero-title" className={adminLabel}>
                  Hero title
                </label>
                <input
                  id="hero-title"
                  type="text"
                  value={form.hero.title}
                  onChange={(event) =>
                    updateField("hero", "title", event.target.value)
                  }
                  className={adminInput}
                />
              </div>

              <div>
                <label htmlFor="hero-subtitle" className={adminLabel}>
                  Hero subtitle
                </label>
                <textarea
                  id="hero-subtitle"
                  rows={4}
                  value={form.hero.subtitle}
                  onChange={(event) =>
                    updateField("hero", "subtitle", event.target.value)
                  }
                  className={adminInput}
                />
              </div>
            </section>

            <section className={`${adminCard} space-y-4 p-6`}>
              <h2 className={adminSectionTitle}>SEO</h2>

              <div>
                <label htmlFor="seo-title" className={adminLabel}>
                  SEO title
                </label>
                <input
                  id="seo-title"
                  type="text"
                  value={form.seo.title}
                  onChange={(event) =>
                    updateField("seo", "title", event.target.value)
                  }
                  className={adminInput}
                />
              </div>

              <div>
                <label htmlFor="seo-description" className={adminLabel}>
                  SEO description
                </label>
                <textarea
                  id="seo-description"
                  rows={3}
                  value={form.seo.description}
                  onChange={(event) =>
                    updateField("seo", "description", event.target.value)
                  }
                  className={adminInput}
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className={
                  saving
                    ? adminButtonDisabled
                    : "rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 admin-dark:bg-amber-600 admin-dark:hover:bg-amber-500"
                }
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 admin-dark:border-zinc-700 admin-dark:bg-zinc-900 admin-dark:text-zinc-200 admin-dark:hover:bg-zinc-800"
              >
                Reset to fallback content
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
