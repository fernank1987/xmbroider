import type { SiteBrand, SiteSeo } from "./siteContent";
import { SITE_ORIGIN } from "./siteSeo";

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const LOCAL_BUSINESS_ID = `${SITE_ORIGIN}/#localbusiness`;

export const STRUCTURED_DATA_AREA_SERVED = [
  "Rhode Island",
  "Massachusetts",
  "Woonsocket, RI",
  "Providence, RI",
  "North Attleborough, MA",
  "Attleboro, MA",
  "Mansfield, MA",
  "Foxborough, MA",
] as const;

export const STRUCTURED_DATA_SERVICES = [
  "custom embroidery",
  "commercial embroidery",
  "hat embroidery",
  "polo embroidery",
  "shirt embroidery",
  "logo embroidery",
  "custom patch embroidery",
  "DTF printing",
  "heat press",
  "custom apparel",
] as const;

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  "Rhode Island": "RI",
  Massachusetts: "MA",
};

function formatTelephoneForSchema(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone.trim();
}

function parsePostalAddressFromLocation(
  location: string,
): Record<string, string> | null {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const locality = parts[0];
  const regionName = parts.slice(1).join(", ");

  return {
    "@type": "PostalAddress",
    addressLocality: locality,
    addressRegion: US_STATE_ABBREVIATIONS[regionName] ?? regionName,
    addressCountry: "US",
  };
}

function buildServiceCatalog(organizationId: string) {
  return {
    "@type": "OfferCatalog",
    name: "Embroidery & Custom Apparel Services",
    itemListElement: STRUCTURED_DATA_SERVICES.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service,
        provider: { "@id": organizationId },
        areaServed: [...STRUCTURED_DATA_AREA_SERVED],
      },
    })),
  };
}

export type HomeStructuredDataInput = {
  brand: SiteBrand;
  seo: SiteSeo;
  googleBusinessProfileUrl?: string | null;
};

/** Builds Organization + LocalBusiness JSON-LD for the homepage. */
export function buildHomeStructuredData({
  brand,
  seo,
  googleBusinessProfileUrl,
}: HomeStructuredDataInput): Record<string, unknown> {
  const telephone = formatTelephoneForSchema(brand.phone);
  const address = parsePostalAddressFromLocation(brand.location);
  const sameAs = googleBusinessProfileUrl?.trim();

  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: brand.name,
    url: SITE_ORIGIN,
    email: brand.email,
    telephone,
    description: seo.description,
    areaServed: [...STRUCTURED_DATA_AREA_SERVED],
    knowsAbout: [...STRUCTURED_DATA_SERVICES],
  };

  if (brand.logoUrl) {
    organization.logo = brand.logoUrl;
  }

  if (sameAs) {
    organization.sameAs = [sameAs];
  }

  const localBusiness: Record<string, unknown> = {
    "@type": "LocalBusiness",
    "@id": LOCAL_BUSINESS_ID,
    name: brand.name,
    url: SITE_ORIGIN,
    email: brand.email,
    telephone,
    description: seo.description,
    areaServed: [...STRUCTURED_DATA_AREA_SERVED],
    parentOrganization: { "@id": ORGANIZATION_ID },
    hasOfferCatalog: buildServiceCatalog(ORGANIZATION_ID),
  };

  if (address) {
    localBusiness.address = address;
  }

  if (brand.logoUrl) {
    localBusiness.image = brand.logoUrl;
  }

  if (sameAs) {
    localBusiness.sameAs = [sameAs];
  }

  return {
    "@context": "https://schema.org",
    "@graph": [organization, localBusiness],
  };
}
