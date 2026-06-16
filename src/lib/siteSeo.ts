import type { Metadata } from "next";
import { siteContent, type SiteSeo } from "@/lib/siteContent";

/** Canonical production origin for xmbroider.com. */
export const SITE_ORIGIN = "https://xmbroider.com";

export const SITE_NAME = siteContent.brand.name;

/** Builds an absolute URL on the production site. */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

/** Root layout metadata derived from editable SEO content (local fallback by default). */
export function buildRootSiteMetadata(seo: SiteSeo = siteContent.seo): Metadata {
  const { title, description } = seo;

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: SITE_ORIGIN,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
