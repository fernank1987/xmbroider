import type { Metadata } from "next";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import ProductDetail from "../../components/ProductDetail";
import {
  getProduct,
  getProductCoverImageUrl,
} from "@/lib/firebase/productRepository";
import { loadPublicSiteContent } from "@/lib/firebase/siteContentRepository";
import { SITE_NAME } from "@/lib/siteSeo";
import { notFound } from "next/navigation";

function buildProductDescription(
  seoDescription: string | null,
  description: string,
  productName: string,
): string {
  if (seoDescription?.trim()) {
    return seoDescription.trim();
  }
  if (description.trim()) {
    return description.trim();
  }
  return `Custom embroidery and DTF apparel for ${productName}. Request a quote from ${SITE_NAME}.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const content = await loadPublicSiteContent();
  const product = await getProduct(content.siteId, productId);

  if (!product || !product.isVisible) {
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };
  }

  const description = buildProductDescription(
    product.seoDescription,
    product.description,
    product.name,
  );
  const title = `${product.name} | ${SITE_NAME}`;
  const coverImage = getProductCoverImageUrl(product);
  const openGraphImages = coverImage
    ? [{ url: coverImage, alt: product.name }]
    : undefined;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/products/${productId}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: openGraphImages,
    },
    twitter: {
      card: coverImage ? "summary_large_image" : "summary",
      title,
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const content = await loadPublicSiteContent();
  const { productId } = await params;
  const product = await getProduct(content.siteId, productId);

  if (!product || !product.isVisible) {
    notFound();
  }

  return (
    <>
      <Header
        content={{
          brand: content.brand,
          navigation: content.navigation,
          headerCta: content.headerCta,
        }}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <ProductDetail product={product} />
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
