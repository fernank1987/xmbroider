import Footer from "../../components/Footer";
import Header from "../../components/Header";
import ProductDetail from "../../components/ProductDetail";
import { getProduct } from "@/lib/firebase/productRepository";
import { loadPublicSiteContent } from "@/lib/firebase/siteContentRepository";
import { notFound } from "next/navigation";

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
