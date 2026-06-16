"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductMockup from "./ProductMockup";
import QuoteSuccessPanel from "./QuoteSuccessPanel";
import TurnstileWidget, { type TurnstileWidgetHandle } from "./TurnstileWidget";
import { generateQuoteRequestId } from "@/lib/firebase/quoteRepository";
import {
  uploadQuoteArtwork,
  uploadQuoteCompositePreview,
  uploadQuotePreviewImage,
  validateQuoteArtworkFile,
} from "@/lib/firebase/storageRepository";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  clamp,
  PLACEMENT_LABELS,
  type Placement,
} from "@/lib/logoPreview";
import { generatePreviewImageBlob } from "@/lib/logoPreviewExport";
import {
  getDefaultVariant,
  getProductVariant,
  getVariantImageFallbackSrc,
  LOGO_PREVIEW_PRODUCTS,
  type PreviewProduct,
  type ProductVariant,
} from "@/lib/logoPreviewProducts";
import { listVisibleProducts } from "@/lib/firebase/productRepository";
import { buildPreviewCatalog, findPreviewProduct } from "@/lib/previewProducts";
import {
  formatMmWithInches,
  getDefaultLogoWidthForPlacement,
  getLogoSizePresetsForPlacement,
  getProductionSizeWarning,
  estimateLogoHeightMm,
  LOGO_WIDTH_FINE_TUNE_MAX_MM,
  LOGO_WIDTH_FINE_TUNE_MIN_MM,
  mmToInches,
} from "@/lib/logoSize";
import {
  containerPercentToGarmentLocal,
  garmentLocalToContainerPercent,
  getGarmentPlacementPreset,
  GARMENT_PLACEMENT_PRESETS,
  hasCustomPreviewCalibration,
  logoWidthMmToContainerWidthPercent,
  MOCKUP_CONTAINER_ASPECT,
  resolvePreviewCalibration,
  type PreviewCalibrationSource,
} from "@/lib/previewCalibration";
import { siteContent } from "@/lib/siteContent";
import {
  getInitialTurnstileToken,
  isQuoteSubmissionAvailable,
  isTurnstileDevBypassActive,
  isTurnstileSubmitReady,
  submitQuoteRequest,
  TURNSTILE_EXPIRED_MESSAGE,
  TURNSTILE_MISSING_CHECK_MESSAGE,
} from "@/lib/turnstileClient";

type LogoPreviewToolProps = {
  siteId: string;
  initialProductId?: string;
};

type QuoteFields = {
  name: string;
  email: string;
  phone: string;
  serviceNeeded: string;
  quantity: string;
  deadline: string;
  projectDetails: string;
};

const emptyQuoteFields: QuoteFields = {
  name: "",
  email: "",
  phone: "",
  serviceNeeded: "",
  quantity: "",
  deadline: "",
  projectDetails: "",
};

const DEFAULT_PRODUCT = LOGO_PREVIEW_PRODUCTS[0];
const DEFAULT_VARIANT = getDefaultVariant(DEFAULT_PRODUCT);
const DEFAULT_PLACEMENT: Placement = "left_chest";
const INITIAL_GARMENT_PLACEMENT = GARMENT_PLACEMENT_PRESETS[DEFAULT_PLACEMENT];
const INITIAL_LOGO_SIZE = getDefaultLogoWidthForPlacement(DEFAULT_PLACEMENT);
const MIN_VIEW_ZOOM = 0.75;
const MAX_VIEW_ZOOM = 2.5;
const VIEW_ZOOM_STEP = 0.15;

function getSubmitErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to submit your preview quote request. Please try again.";
}

function validateQuoteFields(fields: QuoteFields): string | null {
  if (!fields.name.trim()) {
    return "Name is required.";
  }
  if (!fields.email.trim()) {
    return "Email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    return "Enter a valid email address.";
  }
  if (!fields.serviceNeeded.trim()) {
    return "Service needed is required.";
  }
  if (!fields.projectDetails.trim()) {
    return "Project details are required.";
  }
  return null;
}

export default function LogoPreviewTool({ siteId, initialProductId }: LogoPreviewToolProps) {
  const mockupRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileDevBypass = isTurnstileDevBypassActive();
  const submissionAvailable = isQuoteSubmissionAvailable();
  const [catalog, setCatalog] = useState<PreviewProduct[]>(LOGO_PREVIEW_PRODUCTS);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [productId, setProductId] = useState(initialProductId ?? DEFAULT_PRODUCT.id);
  const [variantId, setVariantId] = useState(DEFAULT_VARIANT.id);
  const [selectedSize, setSelectedSize] = useState("");
  const [decorationMethod, setDecorationMethod] = useState("");
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [logoPositionX, setLogoPositionX] = useState(INITIAL_GARMENT_PLACEMENT.x);
  const [logoPositionY, setLogoPositionY] = useState(INITIAL_GARMENT_PLACEMENT.y);
  const [logoWidthMm, setLogoWidthMm] = useState(INITIAL_LOGO_SIZE.widthMm);
  const [sizePresetLabel, setSizePresetLabel] = useState(INITIAL_LOGO_SIZE.label);
  const [artworkAspectRatio, setArtworkAspectRatio] = useState<number | null>(null);
  const [productImageAspect, setProductImageAspect] = useState(1);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const artworkPreviewUrl = useMemo(
    () => (artworkFile ? URL.createObjectURL(artworkFile) : null),
    [artworkFile],
  );
  const [quoteFields, setQuoteFields] = useState<QuoteFields>({
    ...emptyQuoteFields,
    serviceNeeded: DEFAULT_PRODUCT.defaultService,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewZoom, setViewZoom] = useState(1);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(
    getInitialTurnstileToken(),
  );

  const resetTurnstile = () => {
    if (turnstileDevBypass) {
      setTurnstileToken(getInitialTurnstileToken());
      return;
    }
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  };

  const selectedProduct = useMemo(
    () => findPreviewProduct(catalog, productId) ?? catalog[0] ?? DEFAULT_PRODUCT,
    [catalog, productId],
  );
  const selectedVariant = useMemo(
    () => getProductVariant(selectedProduct, variantId) ?? getDefaultVariant(selectedProduct),
    [selectedProduct, variantId],
  );
  const availablePlacements = selectedProduct.placements;

  const activeCalibration = useMemo(
    () => resolvePreviewCalibration(selectedVariant, selectedProduct, placement),
    [selectedVariant, selectedProduct, placement],
  );
  const previewCalibrationSource: PreviewCalibrationSource = activeCalibration.source;
  const previewCalibrationUsed = hasCustomPreviewCalibration(selectedVariant);
  const productPhysicalWidthMm = activeCalibration.physicalWidthMm;
  const logoSizePercent = useMemo(
    () =>
      logoWidthMmToContainerWidthPercent(
        logoWidthMm,
        activeCalibration,
        MOCKUP_CONTAINER_ASPECT,
        productImageAspect,
      ),
    [logoWidthMm, activeCalibration, productImageAspect],
  );
  const logoContainerPosition = useMemo(
    () =>
      garmentLocalToContainerPercent(
        logoPositionX,
        logoPositionY,
        activeCalibration.garmentBounds,
        MOCKUP_CONTAINER_ASPECT,
        productImageAspect,
      ),
    [
      logoPositionX,
      logoPositionY,
      activeCalibration,
      productImageAspect,
    ],
  );
  const estimatedLogoHeightMm = useMemo(
    () => estimateLogoHeightMm(logoWidthMm, artworkAspectRatio),
    [logoWidthMm, artworkAspectRatio],
  );
  const productionSizeWarning = useMemo(
    () => getProductionSizeWarning(placement, logoWidthMm),
    [placement, logoWidthMm],
  );
  const logoSizePresets = useMemo(
    () => getLogoSizePresetsForPlacement(placement),
    [placement],
  );
  const decorationOptions = selectedProduct.decorationMethods ?? [];

  const applyPlacementPreset = (nextPlacement: Placement) => {
    setPlacement(nextPlacement);
    const coords = getGarmentPlacementPreset(nextPlacement);
    setLogoPositionX(coords.x);
    setLogoPositionY(coords.y);
    const defaultLogoSize = getDefaultLogoWidthForPlacement(nextPlacement);
    setLogoWidthMm(defaultLogoSize.widthMm);
    setSizePresetLabel(defaultLogoSize.label);
  };

  const setLogoWidthFromMm = (nextWidthMm: number, presetLabel?: string) => {
    const clamped = clamp(
      nextWidthMm,
      LOGO_WIDTH_FINE_TUNE_MIN_MM,
      LOGO_WIDTH_FINE_TUNE_MAX_MM,
    );
    setLogoWidthMm(clamped);
    setSizePresetLabel(presetLabel ?? "Custom");
  };

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        const products = await listVisibleProducts(siteId);
        if (!cancelled) {
          const nextCatalog = buildPreviewCatalog(products);
          setCatalog(nextCatalog);
          const preferred = findPreviewProduct(nextCatalog, initialProductId);
          const initial = preferred ?? nextCatalog[0] ?? DEFAULT_PRODUCT;
          setProductId(initial.id);
          setVariantId(getDefaultVariant(initial).id);
          setSelectedSize(initial.sizes?.[0] ?? "");
          setDecorationMethod(initial.decorationMethods?.[0] ?? "");
          setQuoteFields((current) => ({
            ...current,
            serviceNeeded: initial.defaultService,
          }));
          applyPlacementPreset(initial.placements[0] ?? DEFAULT_PLACEMENT);
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [siteId, initialProductId]);

  useEffect(() => {
    return () => {
      if (artworkPreviewUrl) {
        URL.revokeObjectURL(artworkPreviewUrl);
      }
    };
  }, [artworkPreviewUrl]);

  const updateQuoteField = (field: keyof QuoteFields, value: string) => {
    setQuoteFields((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
  };

  const handleProductChange = (nextProductId: string) => {
    const product = findPreviewProduct(catalog, nextProductId);
    if (!product) {
      return;
    }

    const defaultVariant = getDefaultVariant(product);
    setProductId(product.id);
    setVariantId(defaultVariant.id);
    setSelectedSize(product.sizes?.[0] ?? "");
    setDecorationMethod(product.decorationMethods?.[0] ?? "");
    applyPlacementPreset(product.placements[0] ?? DEFAULT_PLACEMENT);
    setQuoteFields((current) => ({
      ...current,
      serviceNeeded: product.defaultService,
    }));
  };

  const handleVariantChange = (nextVariantId: string) => {
    setVariantId(nextVariantId);
    setProductImageAspect(1);
    setViewZoom(1);
  };

  const handleProductImageLoad = (aspectRatio: number) => {
    setProductImageAspect(aspectRatio);
  };

  const resetPlacement = () => {
    applyPlacementPreset(placement);
  };

  const resetEditor = () => {
    const product = findPreviewProduct(catalog, productId) ?? DEFAULT_PRODUCT;
    setProductId(product.id);
    setVariantId(getDefaultVariant(product).id);
    setSelectedSize(product.sizes?.[0] ?? "");
    setDecorationMethod(product.decorationMethods?.[0] ?? "");
    applyPlacementPreset(product.placements[0] ?? DEFAULT_PLACEMENT);
    setQuoteFields({
      ...emptyQuoteFields,
      serviceNeeded: product.defaultService,
    });
  };

  const handleArtworkChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setArtworkFile(file);
    setArtworkAspectRatio(null);
    setErrorMessage(null);

    if (file) {
      const validationError = validateQuoteArtworkFile(file);
      if (validationError) {
        setErrorMessage(validationError);
      }
    }
  };

  const handleArtworkPreviewLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      setArtworkAspectRatio(image.naturalWidth / image.naturalHeight);
    }
  };

  const updatePositionFromPointer = (clientX: number, clientY: number) => {
    const mockup = mockupRef.current;
    if (!mockup) {
      return;
    }

    const rect = mockup.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const unscaledX = (localX - rect.width / 2) / viewZoom + rect.width / 2;
    const unscaledY = (localY - rect.height / 2) / viewZoom + rect.height / 2;
    const containerX = (unscaledX / rect.width) * 100;
    const containerY = (unscaledY / rect.height) * 100;
    const local = containerPercentToGarmentLocal(
      containerX,
      containerY,
      activeCalibration.garmentBounds,
      MOCKUP_CONTAINER_ASPECT,
      productImageAspect,
    );
    setLogoPositionX(local.x);
    setLogoPositionY(local.y);
  };

  const handleZoomIn = () => {
    setViewZoom((current) => clamp(current + VIEW_ZOOM_STEP, MIN_VIEW_ZOOM, MAX_VIEW_ZOOM));
  };

  const handleZoomOut = () => {
    setViewZoom((current) => clamp(current - VIEW_ZOOM_STEP, MIN_VIEW_ZOOM, MAX_VIEW_ZOOM));
  };

  const handleZoomReset = () => {
    setViewZoom(1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!isFirebaseConfigured) {
      setErrorMessage(
        "Preview submissions are temporarily unavailable. Please use the homepage quote form or contact us directly.",
      );
      return;
    }

    if (!submissionAvailable) {
      setErrorMessage(
        "Preview submissions are temporarily unavailable. Please contact us directly.",
      );
      return;
    }

    if (!isTurnstileSubmitReady(turnstileToken)) {
      setErrorMessage(TURNSTILE_MISSING_CHECK_MESSAGE);
      return;
    }

    if (!artworkFile || !artworkPreviewUrl) {
      setErrorMessage("Upload your logo or artwork before submitting.");
      return;
    }

    const artworkValidation = validateQuoteArtworkFile(artworkFile);
    if (artworkValidation) {
      setErrorMessage(artworkValidation);
      return;
    }

    const quoteValidation = validateQuoteFields(quoteFields);
    if (quoteValidation) {
      setErrorMessage(quoteValidation);
      return;
    }

    setSubmitting(true);

    try {
      const quoteRequestId = generateQuoteRequestId(siteId);
      const artworkUpload = await uploadQuoteArtwork(siteId, quoteRequestId, artworkFile);
      const productImageSrc =
        selectedVariant.imageSrc ||
        getVariantImageFallbackSrc(selectedVariant.imageSrc);

      let previewImageUrl: string | null = null;
      let previewImageStoragePath: string | null = null;
      let previewCompositeUrl: string | null = null;
      let previewCompositeStoragePath: string | null = null;
      let previewCompositeExportError: string | null = null;

      try {
        const previewBlob = await generatePreviewImageBlob({
          productImageSrc,
          productImageFallbackSrc: selectedVariant.imageSrc
            ? getVariantImageFallbackSrc(selectedVariant.imageSrc)
            : undefined,
          fallbackSwatchColor: selectedVariant.swatchColor,
          artworkObjectUrl: artworkPreviewUrl,
          logoGarmentPositionX: logoPositionX,
          logoGarmentPositionY: logoPositionY,
          logoWidthMm,
          calibration: activeCalibration,
        });

        if (previewBlob) {
          const [previewUpload, compositeUpload] = await Promise.all([
            uploadQuotePreviewImage(siteId, quoteRequestId, previewBlob),
            uploadQuoteCompositePreview(siteId, quoteRequestId, previewBlob),
          ]);
          previewImageUrl = previewUpload.url;
          previewImageStoragePath = previewUpload.path;
          previewCompositeUrl = compositeUpload.url;
          previewCompositeStoragePath = compositeUpload.path;
        } else {
          previewCompositeExportError =
            "Composite preview image could not be generated.";
        }
      } catch (exportError) {
        previewCompositeExportError = getSubmitErrorMessage(exportError);
      }

      const { quoteId } = await submitQuoteRequest({
        siteId,
        turnstileToken: turnstileToken!,
        quoteRequestId,
        quote: {
          name: quoteFields.name,
          email: quoteFields.email,
          phone: quoteFields.phone || undefined,
          serviceNeeded: quoteFields.serviceNeeded,
          quantity: quoteFields.quantity || undefined,
          deadline: quoteFields.deadline || undefined,
          projectDetails: quoteFields.projectDetails,
          source: "logo_preview_tool",
          preview: {
            productId: selectedProduct.id,
            productName: selectedProduct.label,
            productType: selectedProduct.id,
            productLabel: selectedProduct.label,
            productVariantId: selectedVariant.id,
            colorName: selectedVariant.colorName,
            size: selectedSize || null,
            productImageUrl: selectedVariant.imageSrc || null,
            placement,
            logoSize: logoSizePercent,
            logoWidthMm,
            logoWidthInches: mmToInches(logoWidthMm),
            estimatedLogoHeightMm,
            productPhysicalWidthMm,
            sizePresetLabel,
            previewCalibrationUsed,
            previewCalibrationSource,
            productBrand: selectedProduct.brand ?? null,
            productMaterial: selectedProduct.material ?? null,
            decorationMethod: decorationMethod.trim() || null,
            logoPositionX,
            logoPositionY,
            artworkUrl: artworkUpload.url,
            artworkStoragePath: artworkUpload.path,
            previewImageUrl,
            previewImageStoragePath,
            previewCompositeUrl,
            previewCompositeStoragePath,
            previewCompositeExportError,
          },
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[quote] created", {
          quoteId,
          source: "logo_preview_tool",
        });
      }

      setArtworkFile(null);
      resetTurnstile();
      resetEditor();
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(getSubmitErrorMessage(error));
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setSubmitted(false);
    setErrorMessage(null);
    setArtworkFile(null);
    resetTurnstile();
    resetEditor();
  };

  const inputClassName =
    "mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

  if (submitted) {
    return (
      <QuoteSuccessPanel
        title="Preview submitted"
        message="Quote request received. We'll follow up soon."
        primaryAction={{
          label: "Submit another preview",
          onClick: handleSubmitAnother,
        }}
        secondaryAction={{
          label: "Back to homepage",
          href: "/",
        }}
      />
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">1. Choose product</h2>
          {catalogLoading ? (
            <p className="mt-4 text-sm text-muted">Loading products…</p>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap gap-3">
                {catalog.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductChange(product.id)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      productId === product.id
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border bg-background text-muted hover:border-accent/40 hover:text-foreground"
                    }`}
                  >
                    {product.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-foreground">Shirt color</p>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {selectedProduct.variants.map((variant: ProductVariant) => (
                    <button
                      key={variant.id}
                      type="button"
                      title={variant.colorName}
                      onClick={() => handleVariantChange(variant.id)}
                      disabled={submitting}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
                        variantId === variant.id
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/40"
                      }`}
                    >
                      <span
                        className="h-8 w-8 rounded-full border border-slate-300 shadow-sm"
                        style={{ backgroundColor: variant.swatchColor }}
                      />
                      <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-foreground">
                        {variant.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                <div className="mt-6">
                  <label htmlFor="preview-size" className="block text-sm font-medium text-foreground">
                    Size
                  </label>
                  <select
                    id="preview-size"
                    value={selectedSize}
                    disabled={submitting}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Select a size</option>
                    {selectedProduct.sizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              )}
              {decorationOptions.length > 0 && (
                <div className="mt-6">
                  <label
                    htmlFor="preview-decoration"
                    className="block text-sm font-medium text-foreground"
                  >
                    Decoration method
                  </label>
                  <select
                    id="preview-decoration"
                    value={decorationMethod}
                    disabled={submitting}
                    onChange={(event) => setDecorationMethod(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Select decoration (optional)</option>
                    {decorationOptions.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">2. Upload artwork</h2>
          <p className="mt-2 text-sm text-muted">
            PNG, JPG, or WebP up to 10MB. Use a transparent logo when possible.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            disabled={submitting}
            onChange={handleArtworkChange}
            className="mt-4 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-hover"
          />
          {artworkFile && (
            <p className="mt-2 text-sm text-foreground">
              Selected: <span className="font-medium">{artworkFile.name}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">3. Place your logo</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={submitting || viewZoom <= MIN_VIEW_ZOOM}
                aria-label="Zoom out"
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                −
              </button>
              <input
                type="range"
                min={MIN_VIEW_ZOOM}
                max={MAX_VIEW_ZOOM}
                step={VIEW_ZOOM_STEP}
                value={viewZoom}
                disabled={submitting}
                onChange={(event) => setViewZoom(Number(event.target.value))}
                aria-label="View zoom"
                className="w-20 accent-accent sm:w-28"
              />
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={submitting || viewZoom >= MAX_VIEW_ZOOM}
                aria-label="Zoom in"
                className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                disabled={submitting || viewZoom === 1}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset zoom
              </button>
              <button
                type="button"
                onClick={resetPlacement}
                disabled={submitting}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
              >
                Reset position
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {availablePlacements.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyPlacementPreset(option)}
                disabled={submitting}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  placement === option
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {PLACEMENT_LABELS[option]}
              </button>
            ))}
          </div>

          <div
            ref={mockupRef}
            className="relative mt-5 aspect-[4/3] isolate overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc] [color-scheme:light]"
            onPointerMove={(event) => {
              if (dragging) {
                updatePositionFromPointer(event.clientX, event.clientY);
              }
            }}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${viewZoom})`,
                transformOrigin: "center center",
              }}
            >
              <div className="relative h-full w-full">
              <ProductMockup
                key={selectedVariant.id}
                variant={selectedVariant}
                onImageLoad={handleProductImageLoad}
              />
              {artworkPreviewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={artworkPreviewUrl}
                  alt="Uploaded logo preview"
                  draggable={false}
                  onLoad={handleArtworkPreviewLoad}
                  onPointerDown={(event) => {
                    setDragging(true);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    updatePositionFromPointer(event.clientX, event.clientY);
                  }}
                  style={{
                    left: `${logoContainerPosition.x}%`,
                    top: `${logoContainerPosition.y}%`,
                    width: `${logoSizePercent}%`,
                    height: "auto",
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute cursor-move touch-none select-none object-contain opacity-100 [mix-blend-mode:normal]"
                />
              ) : null}
              </div>
            </div>
            {!artworkPreviewUrl ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                <p className="rounded-lg border border-slate-200/80 bg-white/85 px-4 py-2.5 text-center text-sm text-slate-600 shadow-sm backdrop-blur-[1px]">
                  Upload your logo to place it on this product.
                </p>
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-muted">
            {selectedProduct.label} · {selectedVariant.colorName}
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Logo width</p>
              <p className="mt-1 text-sm text-muted">
                {formatMmWithInches(logoWidthMm)}
                {estimatedLogoHeightMm !== null && (
                  <span>
                    {" "}
                    · est. height {estimatedLogoHeightMm.toFixed(1)} mm (
                    {mmToInches(estimatedLogoHeightMm).toFixed(2)} in)
                  </span>
                )}
              </p>
              {sizePresetLabel && (
                <p className="mt-1 text-xs text-muted">Preset: {sizePresetLabel}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {logoSizePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => setLogoWidthFromMm(preset.widthMm, preset.label)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    logoWidthMm === preset.widthMm && sizePresetLabel === preset.label
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted hover:border-accent/40 hover:text-foreground"
                  }`}
                >
                  {preset.label}
                  <span className="mt-0.5 block text-[10px] opacity-80">{preset.widthMm} mm</span>
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="logo-width-mm" className="block text-sm font-medium text-foreground">
                  Custom width (mm)
                </label>
                <input
                  id="logo-width-mm"
                  type="number"
                  min={LOGO_WIDTH_FINE_TUNE_MIN_MM}
                  max={LOGO_WIDTH_FINE_TUNE_MAX_MM}
                  step={1}
                  value={logoWidthMm}
                  disabled={submitting}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      setLogoWidthFromMm(value);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-muted">
                  {mmToInches(logoWidthMm).toFixed(2)} inches · mockup ref{" "}
                  {productPhysicalWidthMm} mm wide
                </p>
              </div>
              <div>
                <label htmlFor="logo-fine-tune" className="block text-sm font-medium text-foreground">
                  Fine-tune width
                </label>
                <input
                  id="logo-fine-tune"
                  type="range"
                  min={LOGO_WIDTH_FINE_TUNE_MIN_MM}
                  max={LOGO_WIDTH_FINE_TUNE_MAX_MM}
                  step={1}
                  value={logoWidthMm}
                  disabled={submitting || !artworkPreviewUrl}
                  onChange={(event) => setLogoWidthFromMm(Number(event.target.value))}
                  className="mt-3 w-full accent-accent"
                />
              </div>
            </div>

            {productionSizeWarning && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  productionSizeWarning.severity === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-blue-200 bg-blue-50 text-blue-900"
                }`}
              >
                {productionSizeWarning.message}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">4. Request your quote</h2>
        <p className="mt-2 text-sm text-muted">
          Submit your preview placement with project details. No checkout required.
        </p>

        {!isFirebaseConfigured && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Online preview submission is unavailable right now. Please use the{" "}
            <Link href="/#quote" className="font-medium underline">
              homepage quote form
            </Link>{" "}
            instead.
          </div>
        )}

        {turnstileDevBypass && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Turnstile keys are not configured. Development anti-spam bypass is active.
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="preview-name" className="block text-sm font-medium text-foreground">
                Name <span className="text-accent">*</span>
              </label>
              <input
                id="preview-name"
                type="text"
                required
                value={quoteFields.name}
                disabled={submitting}
                onChange={(event) => updateQuoteField("name", event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="preview-email" className="block text-sm font-medium text-foreground">
                Email <span className="text-accent">*</span>
              </label>
              <input
                id="preview-email"
                type="email"
                required
                value={quoteFields.email}
                disabled={submitting}
                onChange={(event) => updateQuoteField("email", event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="preview-phone" className="block text-sm font-medium text-foreground">
                Phone
              </label>
              <input
                id="preview-phone"
                type="tel"
                value={quoteFields.phone}
                disabled={submitting}
                onChange={(event) => updateQuoteField("phone", event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="preview-service" className="block text-sm font-medium text-foreground">
                Service needed <span className="text-accent">*</span>
              </label>
              <select
                id="preview-service"
                required
                value={quoteFields.serviceNeeded}
                disabled={submitting}
                onChange={(event) => updateQuoteField("serviceNeeded", event.target.value)}
                className={inputClassName}
              >
                <option value="" disabled>
                  Select a service
                </option>
                {siteContent.quoteSection.form.serviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="preview-quantity" className="block text-sm font-medium text-foreground">
                Quantity
              </label>
              <input
                id="preview-quantity"
                type="text"
                value={quoteFields.quantity}
                disabled={submitting}
                onChange={(event) => updateQuoteField("quantity", event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="preview-deadline" className="block text-sm font-medium text-foreground">
                Deadline
              </label>
              <input
                id="preview-deadline"
                type="text"
                value={quoteFields.deadline}
                disabled={submitting}
                onChange={(event) => updateQuoteField("deadline", event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="preview-details" className="block text-sm font-medium text-foreground">
              Project details <span className="text-accent">*</span>
            </label>
            <textarea
              id="preview-details"
              rows={4}
              required
              value={quoteFields.projectDetails}
              disabled={submitting}
              placeholder={`${selectedProduct.label} · ${selectedVariant.colorName} · ${PLACEMENT_LABELS[placement]}`}
              onChange={(event) => updateQuoteField("projectDetails", event.target.value)}
              className={inputClassName}
            />
          </div>

          {!turnstileDevBypass && (
            <TurnstileWidget
              ref={turnstileRef}
              onTokenChange={setTurnstileToken}
              onExpire={() => setErrorMessage(TURNSTILE_EXPIRED_MESSAGE)}
              onError={() => setErrorMessage(TURNSTILE_MISSING_CHECK_MESSAGE)}
            />
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              !isFirebaseConfigured ||
              !submissionAvailable ||
              !isTurnstileSubmitReady(turnstileToken)
            }
            className="w-full rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Submitting preview…" : "Submit preview quote request"}
          </button>
        </form>
      </section>
    </div>
  );
}
