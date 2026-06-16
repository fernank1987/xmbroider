import type { MetadataRoute } from "next";
import { listVisibleProducts } from "@/lib/firebase/productRepository";
import { siteContent } from "@/lib/siteContent";
import { absoluteUrl } from "@/lib/siteSeo";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: absoluteUrl("/"),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: absoluteUrl("/products"),
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: absoluteUrl("/preview"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productEntries: MetadataRoute.Sitemap = [];

  try {
    const products = await listVisibleProducts(siteContent.siteId);
    productEntries = products.map((product) => ({
      url: absoluteUrl(`/products/${product.id}`),
      lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Firestore unavailable — return static URLs only.
  }

  return [...STATIC_ROUTES, ...productEntries];
}
