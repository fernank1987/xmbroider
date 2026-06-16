import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/siteSeo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/"],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
