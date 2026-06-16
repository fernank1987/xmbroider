import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "./components/Footer";
import Header from "./components/Header";
import QuoteForm from "./components/QuoteForm";
import { listPublicGalleryItems } from "@/lib/firebase/galleryRepository";
import { loadPublicSiteContent } from "@/lib/firebase/siteContentRepository";
import { getServiceIconPath } from "@/lib/serviceIcons";
import type { GalleryItem as FallbackGalleryItem } from "@/lib/siteContent";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

type GalleryDisplayItem = {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
};

function mapFallbackGalleryItems(
  items: FallbackGalleryItem[],
): GalleryDisplayItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.label,
    category: item.category,
    imageUrl: item.imageUrl,
  }));
}

function GalleryPlaceholderIcon() {
  return (
    <svg
      className="h-10 w-10 text-muted/30"
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
  );
}

export default async function Home() {
  const content = await loadPublicSiteContent();
  const firestoreGalleryItems = await listPublicGalleryItems(content.siteId);
  const galleryDisplayItems =
    firestoreGalleryItems.length > 0
      ? firestoreGalleryItems
      : mapFallbackGalleryItems(content.gallery.items);
  const heroFeaturedImage = galleryDisplayItems.find((item) => item.imageUrl);
  const galleryGridClassName =
    galleryDisplayItems.length === 1
      ? "mx-auto mt-12 grid max-w-md grid-cols-1 gap-6"
      : galleryDisplayItems.length === 2
        ? "mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2"
        : "mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";
  const {
    hero,
    servicesSection,
    services,
    howItWorks,
    localSeo,
    previewSection,
    gallery,
    quoteSection,
  } = content;

  return (
    <>
      <Header
        content={{
          brand: content.brand,
          navigation: content.navigation,
          headerCta: content.headerCta,
        }}
      />

      <main>
        <section className="relative overflow-hidden border-b border-border bg-surface">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
              <div className="max-w-xl lg:max-w-none">
                <p className="mb-4 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted">
                  {hero.badge}
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-tight">
                  {hero.title}
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
                  {hero.subtitle}
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href={hero.primaryCta.href}
                    className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
                  >
                    {hero.primaryCta.label}
                  </a>
                  <Link
                    href={hero.secondaryCta.href}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-foreground/5"
                  >
                    {hero.secondaryCta.label}
                  </Link>
                </div>
              </div>

              <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
                {heroFeaturedImage?.imageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-lg shadow-foreground/5">
                    <div className="relative aspect-[4/3] bg-foreground/[0.04]">
                      <Image
                        src={heroFeaturedImage.imageUrl}
                        alt={heroFeaturedImage.title}
                        fill
                        className="object-contain p-4 sm:p-6"
                        sizes="(max-width: 1024px) 100vw, 480px"
                        priority
                      />
                    </div>
                    <div className="border-t border-border px-4 py-3.5 sm:px-5">
                      <p className="text-sm font-semibold text-foreground">
                        {heroFeaturedImage.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {heroFeaturedImage.category}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="overflow-hidden rounded-2xl border border-dashed border-border bg-background/80 shadow-sm"
                    aria-hidden="true"
                  >
                    <div className="flex aspect-[4/3] flex-col items-center justify-center bg-foreground/[0.03] px-6">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-background">
                        <GalleryPlaceholderIcon />
                      </div>
                      <p className="mt-5 text-sm font-medium text-foreground">
                        {previewSection.mockupTitle}
                      </p>
                      <p className="mt-1 max-w-xs text-center text-xs text-muted">
                        {previewSection.mockupSubtitle}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {servicesSection.title}
            </h2>
            <p className="mt-4 text-muted">{servicesSection.description}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                id={service.id}
                className="scroll-mt-24 rounded-xl border border-border bg-surface p-6 transition-shadow hover:shadow-md"
              >
                {service.imageUrl ? (
                  <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg">
                    <Image
                      src={service.imageUrl}
                      alt={service.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={getServiceIconPath(service.iconKey)}
                      />
                    </svg>
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {howItWorks.title}
              </h2>
              <p className="mt-4 text-muted">{howItWorks.description}</p>
            </div>

            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.steps.map((item) => (
                <li key={item.step} className="relative">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {localSeo.title}
            </h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-muted">
              {localSeo.bodyParts.map((part, index) =>
                part.emphasis ? (
                  <strong
                    key={index}
                    className="font-semibold text-foreground"
                  >
                    {part.text}
                  </strong>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {localSeo.areaTags.map((area) => (
                <li
                  key={area}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted"
                >
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="preview"
          className="scroll-mt-20 border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-accent">
                  {previewSection.badge}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {previewSection.title}
                </h2>
                <p className="mt-4 leading-relaxed text-muted">
                  {previewSection.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {previewSection.features.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-muted"
                    >
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={previewSection.cta.href}
                  className="mt-8 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  {previewSection.cta.label}
                </Link>
              </div>

              <div
                className="rounded-2xl border-2 border-dashed border-border bg-background p-8 text-center"
                aria-hidden="true"
              >
                <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-foreground/5">
                  <svg
                    className="h-16 w-16 text-muted/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                </div>
                <p className="mt-6 text-sm font-medium text-muted">
                  {previewSection.mockupTitle}
                </p>
                <p className="mt-1 text-xs text-muted/70">
                  {previewSection.mockupSubtitle}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="gallery"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {gallery.title}
            </h2>
            <p className="mt-4 text-muted">{gallery.description}</p>
          </div>

          <div className={galleryGridClassName}>
            {galleryDisplayItems.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-foreground/[0.04]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.02] sm:p-4"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 transition-colors group-hover:bg-foreground/[0.06]">
                      <GalleryPlaceholderIcon />
                    </div>
                  )}
                </div>
                <div className="border-t border-border px-4 py-3.5 sm:px-5">
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">{item.category}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="quote"
          className="scroll-mt-20 border-t border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {quoteSection.title}
              </h2>
              <p className="mt-4 text-muted">{quoteSection.description}</p>
              <QuoteForm siteId={content.siteId} form={quoteSection.form} />
            </div>
          </div>
        </section>
      </main>

      <Footer
        content={{
          brand: content.brand,
          serviceAreas: content.serviceAreas,
          footer: content.footer,
        }}
      />
    </>
  );
}
