import type { Metadata } from "next";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LogoPreviewTool from "../components/LogoPreviewTool";
import { loadPublicSiteContent } from "@/lib/firebase/siteContentRepository";
import { siteContent } from "@/lib/siteContent";

export const metadata: Metadata = {
  title: "Logo Preview Tool",
  description: siteContent.previewSection.description,
  alternates: {
    canonical: "/preview",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const content = await loadPublicSiteContent();
  const { productId } = await searchParams;

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
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">
              Logo preview tool
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Upload and preview your logo placement
            </h1>
            <p className="mt-4 max-w-3xl text-muted">
              Choose a product mockup, upload your artwork, adjust placement, and
              submit everything with a custom quote request.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <LogoPreviewTool siteId={content.siteId} initialProductId={productId} />
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
