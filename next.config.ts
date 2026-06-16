import type { NextConfig } from "next";

/** Permanent redirects from legacy Bluehost/WordPress URLs. */
const wordpressRedirects = [
  { source: "/home", destination: "/" },
  { source: "/about", destination: "/" },
  { source: "/services", destination: "/products" },
  { source: "/contact", destination: "/#quote" },
  { source: "/shop", destination: "/products" },
  { source: "/product-category/:path*", destination: "/products" },
  { source: "/product/:path*", destination: "/products" },
  { source: "/cart", destination: "/preview" },
  { source: "/checkout", destination: "/preview" },
  { source: "/my-account", destination: "/" },
] as const;

const nextConfig: NextConfig = {
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
