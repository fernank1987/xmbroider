import Footer from "../components/Footer";
import Header from "../components/Header";
import ProductsCatalog from "../components/ProductsCatalog";
import { listVisibleProducts } from "@/lib/firebase/productRepository";
import { loadPublicSiteContent } from "@/lib/firebase/siteContentRepository";

export default async function ProductsPage() {
  const content = await loadPublicSiteContent();
  const products = await listVisibleProducts(content.siteId);

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
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Products
            </h1>
            <p className="mt-4 max-w-3xl text-muted">
              Browse apparel by brand, preview your logo placement, and request a custom quote.
              No checkout — quote-first ordering.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <ProductsCatalog products={products} />
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
