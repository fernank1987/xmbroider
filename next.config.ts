import type { NextConfig } from "next";

/** Permanent redirects from legacy Bluehost/WordPress URLs (order matters). */
const wordpressRedirects = [
  // General pages
  { source: "/home", destination: "/" },
  { source: "/about", destination: "/" },
  { source: "/services", destination: "/products" },
  { source: "/contact", destination: "/#quote" },
  { source: "/shop", destination: "/products" },
  { source: "/cart", destination: "/preview" },
  { source: "/checkout", destination: "/preview" },
  { source: "/my-account", destination: "/" },
  // WooCommerce product categories
  { source: "/product-category/:path*", destination: "/products" },
  // Specific legacy product URLs (before /product/:path* catch-all)
  { source: "/product/team-365-tt51w", destination: "/products" },
  { source: "/product/sport-tek-lst550", destination: "/products" },
  { source: "/product/:path*", destination: "/products" },
  // Specific legacy brand URLs (before /brand/:path* catch-all)
  { source: "/brand/golf-polo-shirt/st550", destination: "/products" },
  { source: "/brand/golf-polo-shirt/lst550", destination: "/products" },
  { source: "/brand/golf-polo-shirt", destination: "/products" },
  { source: "/brand/yupoong/6606", destination: "/products" },
  { source: "/brand/richardson/112fp", destination: "/products" },
  { source: "/brand/team-365/tt51", destination: "/products" },
  { source: "/brand/big-accessories", destination: "/products" },
  { source: "/brand/:path*", destination: "/products" },
] as const;

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  async redirects() {
    return wordpressRedirects.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    }));
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
