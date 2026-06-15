"use client";

import AdminHeader from "../components/AdminHeader";
import {
  adminButtonDisabled,
  adminCard,
  adminInput,
  adminLabel,
  adminNotice,
  adminSectionTitle,
} from "../lib/adminStyles";
import { siteContent } from "@/lib/siteContent";

export default function AdminSiteContentPage() {
  const { brand, hero, seo } = siteContent;

  return (
    <>
      <AdminHeader
        title="Site Content"
        description="Edit brand, hero, and SEO fields. Values are pre-filled from local mock content."
      />

      <div className="flex-1 p-6 lg:p-8">
        <div className={`${adminNotice} mb-6`}>
          Saving will be connected to Firestore later. Form changes on this page
          are not persisted.
        </div>

        <form className="max-w-3xl space-y-8" onSubmit={(e) => e.preventDefault()}>
          <section className={`${adminCard} space-y-4 p-6`}>
            <h2 className={adminSectionTitle}>Brand</h2>

            <div>
              <label htmlFor="brand-name" className={adminLabel}>
                Brand name
              </label>
              <input
                id="brand-name"
                type="text"
                defaultValue={brand.name}
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
                defaultValue={brand.tagline}
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
                  defaultValue={brand.phone}
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
                  defaultValue={brand.email}
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
                defaultValue={brand.location}
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
                defaultValue={hero.title}
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
                defaultValue={hero.subtitle}
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
                defaultValue={seo.title}
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
                defaultValue={seo.description}
                className={adminInput}
              />
            </div>
          </section>

          <button type="submit" disabled className={adminButtonDisabled}>
            Save changes (coming soon)
          </button>
        </form>
      </div>
    </>
  );
}
