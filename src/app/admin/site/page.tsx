"use client";

import AdminHeader from "../components/AdminHeader";
import { siteContent } from "@/lib/siteContent";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

const labelClassName = "block text-sm font-medium text-zinc-300";

export default function AdminSiteContentPage() {
  const { brand, hero, seo } = siteContent;

  return (
    <>
      <AdminHeader
        title="Site Content"
        description="Edit brand, hero, and SEO fields. Values are pre-filled from local mock content."
      />

      <div className="flex-1 p-6 lg:p-8">
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Saving will be connected to Firestore later. Form changes on this page
          are not persisted.
        </div>

        <form className="max-w-3xl space-y-8" onSubmit={(e) => e.preventDefault()}>
          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-base font-semibold text-white">Brand</h2>

            <div>
              <label htmlFor="brand-name" className={labelClassName}>
                Brand name
              </label>
              <input
                id="brand-name"
                type="text"
                defaultValue={brand.name}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="brand-tagline" className={labelClassName}>
                Tagline
              </label>
              <input
                id="brand-tagline"
                type="text"
                defaultValue={brand.tagline}
                className={inputClassName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="brand-phone" className={labelClassName}>
                  Phone
                </label>
                <input
                  id="brand-phone"
                  type="tel"
                  defaultValue={brand.phone}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="brand-email" className={labelClassName}>
                  Email
                </label>
                <input
                  id="brand-email"
                  type="email"
                  defaultValue={brand.email}
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="brand-location" className={labelClassName}>
                Location
              </label>
              <input
                id="brand-location"
                type="text"
                defaultValue={brand.location}
                className={inputClassName}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-base font-semibold text-white">Hero</h2>

            <div>
              <label htmlFor="hero-title" className={labelClassName}>
                Hero title
              </label>
              <input
                id="hero-title"
                type="text"
                defaultValue={hero.title}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="hero-subtitle" className={labelClassName}>
                Hero subtitle
              </label>
              <textarea
                id="hero-subtitle"
                rows={4}
                defaultValue={hero.subtitle}
                className={inputClassName}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-base font-semibold text-white">SEO</h2>

            <div>
              <label htmlFor="seo-title" className={labelClassName}>
                SEO title
              </label>
              <input
                id="seo-title"
                type="text"
                defaultValue={seo.title}
                className={inputClassName}
              />
            </div>

            <div>
              <label htmlFor="seo-description" className={labelClassName}>
                SEO description
              </label>
              <textarea
                id="seo-description"
                rows={3}
                defaultValue={seo.description}
                className={inputClassName}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled
            className="cursor-not-allowed rounded-lg bg-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-400"
          >
            Save changes (coming soon)
          </button>
        </form>
      </div>
    </>
  );
}
