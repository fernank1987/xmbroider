"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductMockup from "./ProductMockup";
import QuoteSuccessPanel from "./QuoteSuccessPanel";
import QuoteEstimatorCard, { buildLiveEstimate } from "./QuoteEstimatorCard";
import TurnstileWidget, { type TurnstileWidgetHandle } from "./TurnstileWidget";
import { generateQuoteRequestId } from "@/lib/firebase/quoteRepository";
import {
  uploadQuoteArtwork,
  uploadQuoteCompositePreview,
  validateQuoteArtworkFile,
} from "@/lib/firebase/storageRepository";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  clamp,
  PLACEMENT_LABELS,
  type Placement,
} from "@/lib/logoPreview";
import {
  captureAndUploadCompositePreview,
} from "@/lib/mockupDomCapture";
import { flushAnimationFrames } from "@/lib/mockupCaptureImages";
import {
  applyPlacementToSlot,
  createInitialLogoSlots,
  getEnabledLogoSlots,
  toQuoteLogoPlacement,
  type PreviewLogoSlot,
} from "@/lib/logoPreviewSlots";
import {
  getDefaultVariant,
  getProductVariant,
  LOGO_PREVIEW_PRODUCTS,
  type PreviewProduct,
  type ProductVariant,
} from "@/lib/logoPreviewProducts";
import { listVisibleProducts } from "@/lib/firebase/productRepository";
import { buildPreviewCatalog, findPreviewProduct } from "@/lib/previewProducts";
import {
  formatMmWithInches,
  getLogoSizePresetsForPlacement,
  getProductionSizeWarning,
  estimateLogoHeightMm,
  LOGO_WIDTH_FINE_TUNE_MAX_MM,
  LOGO_WIDTH_FINE_TUNE_MIN_MM,
  mmToInches,
} from "@/lib/logoSize";
import {
  APPROXIMATE_MOCKUP_WARNING,
  getMockupImageSideForPlacement,
  getVariantPhotoUrl,
  toAbsoluteAssetUrl,
  type MockupImageSide,
} from "@/lib/productMockupImage";
import {
  containerPercentToGarmentLocal,
  garmentLocalToContainerPercent,
  hasCustomPreviewCalibration,
  logoWidthMmToContainerWidthPercent,
  MOCKUP_CONTAINER_ASPECT,
  resolvePreviewCalibration,
  type PreviewCalibrationSource,
} from "@/lib/previewCalibration";
import { siteContent } from "@/lib/siteContent";
import {
  getInitialTurnstileToken,
  getTurnstileStatusText,
  isQuoteSubmissionAvailable,
  isTurnstileDevBypassActive,
  isTurnstileSubmitReady,
  submitQuoteRequest,
  TURNSTILE_EXPIRED_MESSAGE,
  TURNSTILE_MISSING_CHECK_MESSAGE,
} from "@/lib/turnstileClient";
import {
  mapPreviewPlacementToEstimator,
} from "@/lib/pricing/previewPricing";
import type {
  EstimateMode,
  EstimatorComplexity,
  EstimatorPlacement,
} from "@/lib/pricing/embroideryEstimator";
import { resolvePreviewProductPricing } from "@/lib/pricing/previewEstimate";

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
  quantity: "24",
  deadline: "",
  projectDetails: "",
};

const DEFAULT_ESTIMATE_QUANTITY = 24;

const DEFAULT_PRODUCT = LOGO_PREVIEW_PRODUCTS[0];
const DEFAULT_VARIANT = getDefaultVariant(DEFAULT_PRODUCT);
const MIN_VIEW_ZOOM = 0.75;
const MAX_VIEW_ZOOM = 2.5;
const VIEW_ZOOM_STEP = 0.15;

type LogoDragState = {
  slotIndex: number;
  offsetX: number;
  offsetY: number;
};

type LogoDragContext = {
  variant: ProductVariant;
  product: PreviewProduct;
  viewZoom: number;
  productImageAspect: number;
  logoSlots: PreviewLogoSlot[];
};

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

function slotVisibleOnMockupSide(slot: PreviewLogoSlot, side: MockupImageSide): boolean {
  return side === "back" ? slot.placement === "back" : slot.placement !== "back";
}

function getSlotContainerPosition(
  slot: PreviewLogoSlot,
  variant: ProductVariant,
  product: PreviewProduct,
  productImageAspect: number,
) {
  const calibration = resolvePreviewCalibration(variant, product, slot.placement);
  return {
    calibration,
    position: garmentLocalToContainerPercent(
      slot.positionX,
      slot.positionY,
      calibration.garmentBounds,
      MOCKUP_CONTAINER_ASPECT,
      productImageAspect,
    ),
    sizePercent: logoWidthMmToContainerWidthPercent(
      slot.widthMm,
      calibration,
      MOCKUP_CONTAINER_ASPECT,
      productImageAspect,
    ),
  };
}

export default function LogoPreviewTool({ siteId, initialProductId }: LogoPreviewToolProps) {
  const mockupRef = useRef<HTMLDivElement>(null);
  const previewCaptureStageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<LogoDragState | null>(null);
  const dragContextRef = useRef<LogoDragContext>({
    variant: DEFAULT_VARIANT,
    product: DEFAULT_PRODUCT,
    viewZoom: 1,
    productImageAspect: 1,
    logoSlots: createInitialLogoSlots(),
  });
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileDevBypass = isTurnstileDevBypassActive();
  const submissionAvailable = isQuoteSubmissionAvailable();
  const [catalog, setCatalog] = useState<PreviewProduct[]>(LOGO_PREVIEW_PRODUCTS);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [productId, setProductId] = useState(initialProductId ?? DEFAULT_PRODUCT.id);
  const [variantId, setVariantId] = useState(DEFAULT_VARIANT.id);
  const [selectedSize, setSelectedSize] = useState("");
  const [decorationMethod, setDecorationMethod] = useState("");
  const [logoSlots, setLogoSlots] = useState<PreviewLogoSlot[]>(createInitialLogoSlots);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [productImageAspect, setProductImageAspect] = useState(1);
  const [approximateMockup, setApproximateMockup] = useState(false);
  const [quoteFields, setQuoteFields] = useState<QuoteFields>({
    ...emptyQuoteFields,
    serviceNeeded: DEFAULT_PRODUCT.defaultService,
  });
  const [submitting, setSubmitting] = useState(false);
  const [isCapturingPreview, setIsCapturingPreview] = useState(false);
  const [previewCaptureDebugError, setPreviewCaptureDebugError] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [viewZoom, setViewZoom] = useState(1);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(
    getInitialTurnstileToken(),
  );
  const [turnstileExpired, setTurnstileExpired] = useState(false);
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0);
  const [estimateQuantity, setEstimateQuantity] = useState(DEFAULT_ESTIMATE_QUANTITY);
  const [estimatePlacement, setEstimatePlacement] = useState<EstimatorPlacement>("leftChest");
  const [estimateComplexity, setEstimateComplexity] =
    useState<EstimatorComplexity>("standard");
  const [estimateMode, setEstimateMode] = useState<EstimateMode>("basic");
  const [estimatedStitches, setEstimatedStitches] = useState<number | null>(null);

  const logo1File = logoSlots[0]?.artworkFile ?? null;
  const logo2File = logoSlots[1]?.artworkFile ?? null;
  const slotArtworkUrls = useMemo(
    () => [
      logo1File ? URL.createObjectURL(logo1File) : null,
      logo2File ? URL.createObjectURL(logo2File) : null,
    ],
    [logo1File, logo2File],
  );

  const resetTurnstile = useCallback(() => {
    setTurnstileExpired(false);
    if (turnstileDevBypass) {
      setTurnstileToken(getInitialTurnstileToken());
      return;
    }
    turnstileRef.current?.reset();
  }, [turnstileDevBypass]);

  const handleTurnstileTokenChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
    if (token) {
      setTurnstileExpired(false);
      setErrorMessage(null);
    }
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileExpired(true);
    setErrorMessage(TURNSTILE_EXPIRED_MESSAGE);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileExpired(false);
    setErrorMessage(TURNSTILE_MISSING_CHECK_MESSAGE);
  }, []);

  const turnstileStatusText = getTurnstileStatusText({
    token: turnstileToken,
    expired: turnstileExpired,
    devBypass: turnstileDevBypass,
  });

  const selectedProduct = useMemo(
    () => findPreviewProduct(catalog, productId) ?? catalog[0] ?? DEFAULT_PRODUCT,
    [catalog, productId],
  );

  const handleEstimateModeChange = (mode: EstimateMode) => {
    setEstimateMode(mode);
    if (mode === "stitchCount" && estimatedStitches === null) {
      const pricing = resolvePreviewProductPricing(selectedProduct);
      const defaultStitches = pricing.stitchPricing.defaultEstimatedStitches;
      if (defaultStitches !== null && defaultStitches > 0) {
        setEstimatedStitches(defaultStitches);
      }
    }
  };

  const selectedVariant = useMemo(
    () => getProductVariant(selectedProduct, variantId) ?? getDefaultVariant(selectedProduct),
    [selectedProduct, variantId],
  );
  const availablePlacements = selectedProduct.placements;
  const activeSlot = logoSlots[activeSlotIndex] ?? logoSlots[0];
  const enabledSlots = useMemo(() => getEnabledLogoSlots(logoSlots), [logoSlots]);
  const mockupSide = useMemo(
    () => getMockupImageSideForPlacement(activeSlot.placement),
    [activeSlot.placement],
  );
  const activeCalibration = useMemo(
    () => resolvePreviewCalibration(selectedVariant, selectedProduct, activeSlot.placement),
    [selectedVariant, selectedProduct, activeSlot.placement],
  );
  const previewCalibrationSource: PreviewCalibrationSource = activeCalibration.source;
  const previewCalibrationUsed = hasCustomPreviewCalibration(selectedVariant);
  const productPhysicalWidthMm = activeCalibration.physicalWidthMm;
  const estimatedLogoHeightMm = useMemo(
    () => estimateLogoHeightMm(activeSlot.widthMm, activeSlot.aspectRatio),
    [activeSlot.widthMm, activeSlot.aspectRatio],
  );
  const productionSizeWarning = useMemo(
    () => getProductionSizeWarning(activeSlot.placement, activeSlot.widthMm),
    [activeSlot.placement, activeSlot.widthMm],
  );
  const logoSizePresets = useMemo(
    () => getLogoSizePresetsForPlacement(activeSlot.placement),
    [activeSlot.placement],
  );
  const decorationOptions = selectedProduct.decorationMethods ?? [];
  const visibleMockupSlots = useMemo(
    () =>
      logoSlots
        .map((slot, index) => ({ slot, index }))
        .filter(
          ({ slot }) => slot.enabled && slotVisibleOnMockupSide(slot, mockupSide),
        ),
    [logoSlots, mockupSide],
  );
  const hasAnyArtwork = enabledSlots.some((slot) => slot.artworkFile !== null);

  useEffect(() => {
    dragContextRef.current = {
      variant: selectedVariant,
      product: selectedProduct,
      viewZoom,
      productImageAspect,
      logoSlots,
    };
  }, [selectedVariant, selectedProduct, viewZoom, productImageAspect, logoSlots]);

  const updateSlot = (
    index: number,
    updater: (slot: PreviewLogoSlot) => PreviewLogoSlot,
  ) => {
    setLogoSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? updater(slot) : slot)),
    );
  };

  const pointerToGarmentLocal = (clientX: number, clientY: number, slotIndex: number) => {
    const mockup = mockupRef.current;
    if (!mockup) {
      return null;
    }

    const { variant, product, viewZoom: zoom, productImageAspect: imageAspect, logoSlots: slots } =
      dragContextRef.current;
    const slot = slots[slotIndex];
    if (!slot) {
      return null;
    }

    const calibration = resolvePreviewCalibration(variant, product, slot.placement);
    const rect = mockup.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const unscaledX = (localX - rect.width / 2) / zoom + rect.width / 2;
    const unscaledY = (localY - rect.height / 2) / zoom + rect.height / 2;
    const containerX = (unscaledX / rect.width) * 100;
    const containerY = (unscaledY / rect.height) * 100;

    return containerPercentToGarmentLocal(
      containerX,
      containerY,
      calibration.garmentBounds,
      MOCKUP_CONTAINER_ASPECT,
      imageAspect,
    );
  };

  const handleLogoPointerDown = (
    slotIndex: number,
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setActiveSlotIndex(slotIndex);
    setEstimatePlacement(
      mapPreviewPlacementToEstimator(
        dragContextRef.current.logoSlots[slotIndex]?.placement ?? "left_chest",
      ),
    );

    const local = pointerToGarmentLocal(event.clientX, event.clientY, slotIndex);
    if (!local) {
      return;
    }

    const slot = dragContextRef.current.logoSlots[slotIndex];
    dragStateRef.current = {
      slotIndex,
      offsetX: local.x - slot.positionX,
      offsetY: local.y - slot.positionY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLogoPointerMove = (
    slotIndex: number,
    event: React.PointerEvent<HTMLImageElement>,
  ) => {
    const drag = dragStateRef.current;
    if (!drag || drag.slotIndex !== slotIndex) {
      return;
    }
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const local = pointerToGarmentLocal(event.clientX, event.clientY, slotIndex);
    if (!local) {
      return;
    }

    updateSlot(slotIndex, (slot) => ({
      ...slot,
      positionX: local.x - drag.offsetX,
      positionY: local.y - drag.offsetY,
    }));
  };

  const handleLogoPointerUp = (event: React.PointerEvent<HTMLImageElement>) => {
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const applyPlacementPreset = (index: number, nextPlacement: Placement) => {
    updateSlot(index, (slot) => applyPlacementToSlot(slot, nextPlacement));
    setEstimatePlacement(mapPreviewPlacementToEstimator(nextPlacement));
  };

  const selectActiveSlot = (index: number, placement: Placement) => {
    setActiveSlotIndex(index);
    setEstimatePlacement(mapPreviewPlacementToEstimator(placement));
  };

  const setLogoWidthFromMm = (index: number, nextWidthMm: number, presetLabel?: string) => {
    const clamped = clamp(
      nextWidthMm,
      LOGO_WIDTH_FINE_TUNE_MIN_MM,
      LOGO_WIDTH_FINE_TUNE_MAX_MM,
    );
    updateSlot(index, (slot) => ({
      ...slot,
      widthMm: clamped,
      sizePresetLabel: presetLabel ?? "Custom",
    }));
  };

  const resetPlacement = () => {
    applyPlacementPreset(activeSlotIndex, activeSlot.placement);
  };

  const handleEstimateQuantityChange = (quantity: number) => {
    setEstimateQuantity(quantity);
    setQuoteFields((current) => ({ ...current, quantity: String(quantity) }));
  };

  const resetEditor = () => {
    const product = findPreviewProduct(catalog, productId) ?? DEFAULT_PRODUCT;
    setProductId(product.id);
    setVariantId(getDefaultVariant(product).id);
    setSelectedSize(product.sizes?.[0] ?? "");
    setDecorationMethod(product.decorationMethods?.[0] ?? "");
    setLogoSlots(createInitialLogoSlots());
    setActiveSlotIndex(0);
    setQuoteFields({
      ...emptyQuoteFields,
      serviceNeeded: product.defaultService,
    });
    setEstimateQuantity(DEFAULT_ESTIMATE_QUANTITY);
    setEstimatePlacement("leftChest");
    setEstimateComplexity("standard");
    setEstimateMode("basic");
    setEstimatedStitches(null);
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
          setLogoSlots(createInitialLogoSlots());
          setActiveSlotIndex(0);
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
      slotArtworkUrls.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [slotArtworkUrls]);

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
    setLogoSlots(createInitialLogoSlots());
    setActiveSlotIndex(0);
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

  const handleApproximateFallback = useCallback((approximate: boolean) => {
    setApproximateMockup(approximate);
  }, []);

  const handleArtworkChange = (
    slotIndex: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    updateSlot(slotIndex, (slot) => ({
      ...slot,
      artworkFile: file,
      aspectRatio: null,
    }));
    setErrorMessage(null);

    if (file) {
      const validationError = validateQuoteArtworkFile(file);
      if (validationError) {
        setErrorMessage(validationError);
      }
    }
  };

  const handleArtworkPreviewLoad = (
    slotIndex: number,
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const image = event.currentTarget;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      updateSlot(slotIndex, (slot) => ({
        ...slot,
        aspectRatio: image.naturalWidth / image.naturalHeight,
      }));
    }
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

  const handleAddSecondLogo = () => {
    updateSlot(1, (slot) => ({ ...slot, enabled: true }));
    setActiveSlotIndex(1);
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

    if (enabledSlots.length === 0) {
      setErrorMessage("Upload your logo or artwork before submitting.");
      return;
    }

    for (const slot of enabledSlots) {
      if (!slot.artworkFile) {
        setErrorMessage(`Upload artwork for ${slot.label} before submitting.`);
        return;
      }
      const artworkValidation = validateQuoteArtworkFile(slot.artworkFile);
      if (artworkValidation) {
        setErrorMessage(artworkValidation);
        return;
      }
    }

    const quoteValidation = validateQuoteFields(quoteFields);
    if (quoteValidation) {
      setErrorMessage(quoteValidation);
      return;
    }

    setSubmitting(true);
    setPreviewCaptureDebugError(null);

    try {
      const quoteRequestId = generateQuoteRequestId(siteId);
      const uploadResults = await Promise.all(
        enabledSlots.map(async (slot) => {
          const slotIndex = logoSlots.findIndex((entry) => entry.id === slot.id);
          const upload = await uploadQuoteArtwork(
            siteId,
            quoteRequestId,
            slot.artworkFile!,
          );
          return { slot, slotIndex, upload };
        }),
      );

      const logoPlacements = uploadResults.map(({ slot, upload }) =>
        toQuoteLogoPlacement(slot, upload.url, upload.path),
      );
      const primarySlot = enabledSlots[0];
      const primaryUpload = uploadResults.find(({ slot }) => slot.id === primarySlot.id)?.upload;
      const primaryCalibration = resolvePreviewCalibration(
        selectedVariant,
        selectedProduct,
        primarySlot.placement,
      );
      const primaryLogoSizePercent = logoWidthMmToContainerWidthPercent(
        primarySlot.widthMm,
        primaryCalibration,
        MOCKUP_CONTAINER_ASPECT,
        productImageAspect,
      );
      const productPhotoUrl = toAbsoluteAssetUrl(
        getVariantPhotoUrl(selectedVariant, mockupSide),
      );

      let previewImageUrl: string | null = null;
      let previewImageStoragePath: string | null = null;
      let previewCompositeUrl: string | null = null;
      let previewCompositeStoragePath: string | null = null;
      let previewCompositeExportError: string | null = null;

      setIsCapturingPreview(true);
      await flushAnimationFrames(2);

      const captureStage = mockupRef.current ?? previewCaptureStageRef.current;
      const captureUpload = await captureAndUploadCompositePreview({
        siteId,
        quoteRequestId,
        stageElement: captureStage,
        upload: uploadQuoteCompositePreview,
      });

      if (captureUpload.ok) {
        previewCompositeUrl = captureUpload.result.previewCompositeUrl;
        previewCompositeStoragePath = captureUpload.result.previewCompositeStoragePath;
        previewImageUrl = captureUpload.result.previewImageUrl;
        previewImageStoragePath = captureUpload.result.previewImageStoragePath;
        if (process.env.NODE_ENV === "development") {
          console.log("[preview-export] composite uploaded", {
            previewCompositeUrl,
            previewCompositeStoragePath,
          });
        }
      } else {
        previewCompositeExportError = captureUpload.error;
        if (process.env.NODE_ENV === "development") {
          setPreviewCaptureDebugError(captureUpload.error);
          console.error("[preview-export] capture/upload failed", captureUpload.error);
        }
      }

      setIsCapturingPreview(false);

      const placementSummary = enabledSlots
        .map((slot) => `${slot.label}: ${PLACEMENT_LABELS[slot.placement]}`)
        .join(" · ");

      const priceEstimate = buildLiveEstimate({
        product: selectedProduct,
        quantity: estimateQuantity,
        placement: estimatePlacement,
        complexity: estimateComplexity,
        estimateMode,
        estimatedStitches,
      });

      const { quoteId } = await submitQuoteRequest({
        siteId,
        turnstileToken: turnstileToken!,
        quoteRequestId,
        quote: {
          name: quoteFields.name,
          email: quoteFields.email,
          phone: quoteFields.phone || undefined,
          serviceNeeded: quoteFields.serviceNeeded,
          quantity: String(estimateQuantity),
          deadline: quoteFields.deadline || undefined,
          projectDetails: quoteFields.projectDetails,
          source: "logo_preview_tool",
          priceEstimate,
          preview: {
            productId: selectedProduct.id,
            productName: selectedProduct.label,
            productType: selectedProduct.id,
            productLabel: selectedProduct.label,
            productVariantId: selectedVariant.id,
            colorName: selectedVariant.colorName,
            size: selectedSize || null,
            productImageUrl: productPhotoUrl ?? selectedVariant.imageSrc ?? null,
            placement: primarySlot.placement,
            logoSize: primaryLogoSizePercent,
            logoWidthMm: primarySlot.widthMm,
            logoWidthInches: mmToInches(primarySlot.widthMm),
            estimatedLogoHeightMm: estimateLogoHeightMm(
              primarySlot.widthMm,
              primarySlot.aspectRatio,
            ),
            productPhysicalWidthMm,
            sizePresetLabel: primarySlot.sizePresetLabel,
            previewCalibrationUsed,
            previewCalibrationSource,
            productBrand: selectedProduct.brand ?? null,
            productMaterial: selectedProduct.material ?? null,
            decorationMethod: decorationMethod.trim() || null,
            logoPositionX: primarySlot.positionX,
            logoPositionY: primarySlot.positionY,
            artworkUrl: primaryUpload?.url ?? "",
            artworkStoragePath: primaryUpload?.path ?? "",
            previewImageUrl,
            previewImageStoragePath,
            previewCompositeUrl,
            previewCompositeStoragePath,
            previewCompositeExportError,
            logoPlacements,
          },
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[quote] created", {
          quoteId,
          source: "logo_preview_tool",
          logoCount: logoPlacements.length,
          placementSummary,
          previewCompositeUrl,
          previewImageUrl,
          previewCompositeExportError,
        });
      }

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
    setPreviewCaptureDebugError(null);
    setErrorMessage(null);
    setTurnstileToken(turnstileDevBypass ? getInitialTurnstileToken() : null);
    setTurnstileExpired(false);
    setTurnstileWidgetKey((current) => current + 1);
    resetEditor();
  };

  const inputClassName =
    "mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

  if (submitted) {
    return (
      <>
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
        {process.env.NODE_ENV === "development" && previewCaptureDebugError ? (
          <p className="mx-auto mt-4 max-w-6xl px-4 text-sm text-amber-800">
            Preview capture failed: {previewCaptureDebugError}
          </p>
        ) : null}
      </>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">2. Upload artwork</h2>
            {!logoSlots[1].enabled && (
              <button
                type="button"
                onClick={handleAddSecondLogo}
                disabled={submitting}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
              >
                Add second logo
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            PNG, JPG, or WebP up to 10MB. Use a transparent logo when possible.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {logoSlots.map((slot, index) =>
              slot.enabled ? (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => selectActiveSlot(index, slot.placement)}
                  disabled={submitting}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeSlotIndex === index
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {slot.label}
                </button>
              ) : null,
            )}
          </div>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            disabled={submitting}
            onChange={(event) => handleArtworkChange(activeSlotIndex, event)}
            className="mt-4 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-accent-hover"
          />
          {activeSlot.artworkFile && (
            <p className="mt-2 text-sm text-foreground">
              Selected ({activeSlot.label}):{" "}
              <span className="font-medium">{activeSlot.artworkFile.name}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              3. Place {activeSlot.label.toLowerCase()}
            </h2>
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
                onClick={() => applyPlacementPreset(activeSlotIndex, option)}
                disabled={submitting}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSlot.placement === option
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
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${viewZoom})`,
                transformOrigin: "center center",
              }}
            >
              <div ref={previewCaptureStageRef} className="relative h-full w-full">
                <ProductMockup
                  key={`${selectedProduct.id}-${selectedVariant.id}-${mockupSide}`}
                  variant={selectedVariant}
                  imageSide={mockupSide}
                  productId={selectedProduct.id}
                  onImageLoad={handleProductImageLoad}
                  onApproximateFallback={handleApproximateFallback}
                />
                {visibleMockupSlots.map(({ slot, index }) => {
                  const artworkUrl = slotArtworkUrls[index];
                  if (!artworkUrl) {
                    return null;
                  }
                  const overlay = getSlotContainerPosition(
                    slot,
                    selectedVariant,
                    selectedProduct,
                    productImageAspect,
                  );
                  const isActive = index === activeSlotIndex;
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={slot.id}
                      src={artworkUrl}
                      alt={`${slot.label} preview`}
                      data-mockup-logo-image="true"
                      data-logo-label={slot.label}
                      draggable={false}
                      onLoad={(event) => handleArtworkPreviewLoad(index, event)}
                      onPointerDown={(event) => handleLogoPointerDown(index, event)}
                      onPointerMove={(event) => handleLogoPointerMove(index, event)}
                      onPointerUp={handleLogoPointerUp}
                      onPointerCancel={handleLogoPointerUp}
                      style={{
                        left: `${overlay.position.x}%`,
                        top: `${overlay.position.y}%`,
                        width: `${overlay.sizePercent}%`,
                        height: "auto",
                        transform: "translate(-50%, -50%)",
                        outline:
                          isActive && !isCapturingPreview
                            ? "2px solid rgba(59, 130, 246, 0.75)"
                            : undefined,
                      }}
                      className={`absolute touch-none select-none object-contain opacity-100 [mix-blend-mode:normal] ${
                        isActive ? "cursor-move" : "cursor-pointer"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            {!hasAnyArtwork ? (
              <div
                data-preview-placeholder="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
              >
                <p className="rounded-lg border border-slate-200/80 bg-white/85 px-4 py-2.5 text-center text-sm text-slate-600 shadow-sm backdrop-blur-[1px]">
                  Upload your logo to place it on this product.
                </p>
              </div>
            ) : null}
          </div>

          {approximateMockup && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              {APPROXIMATE_MOCKUP_WARNING}
            </p>
          )}

          <p className="mt-3 text-sm text-muted">
            {selectedProduct.label} · {selectedVariant.colorName}
            {mockupSide === "back" ? " · Back view" : " · Front view"}
            {enabledSlots.length > 1 ? ` · ${enabledSlots.length} logos` : ""}
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {activeSlot.label} width
              </p>
              <p className="mt-1 text-sm text-muted">
                {formatMmWithInches(activeSlot.widthMm)}
                {estimatedLogoHeightMm !== null && (
                  <span>
                    {" "}
                    · est. height {estimatedLogoHeightMm.toFixed(1)} mm (
                    {mmToInches(estimatedLogoHeightMm).toFixed(2)} in)
                  </span>
                )}
              </p>
              {activeSlot.sizePresetLabel && (
                <p className="mt-1 text-xs text-muted">
                  Preset: {activeSlot.sizePresetLabel}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {logoSizePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    setLogoWidthFromMm(activeSlotIndex, preset.widthMm, preset.label)
                  }
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    activeSlot.widthMm === preset.widthMm &&
                    activeSlot.sizePresetLabel === preset.label
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
                  value={activeSlot.widthMm}
                  disabled={submitting}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      setLogoWidthFromMm(activeSlotIndex, value);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-muted">
                  {mmToInches(activeSlot.widthMm).toFixed(2)} inches · mockup ref{" "}
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
                  value={activeSlot.widthMm}
                  disabled={submitting || !activeSlot.artworkFile}
                  onChange={(event) =>
                    setLogoWidthFromMm(activeSlotIndex, Number(event.target.value))
                  }
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

      <QuoteEstimatorCard
        product={selectedProduct}
        quantity={estimateQuantity}
        placement={estimatePlacement}
        complexity={estimateComplexity}
        estimateMode={estimateMode}
        estimatedStitches={estimatedStitches}
        disabled={submitting}
        onQuantityChange={handleEstimateQuantityChange}
        onPlacementChange={setEstimatePlacement}
        onComplexityChange={setEstimateComplexity}
        onEstimateModeChange={handleEstimateModeChange}
        onEstimatedStitchesChange={setEstimatedStitches}
      />

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
              placeholder={`${selectedProduct.label} · ${selectedVariant.colorName} · ${enabledSlots
                .map((slot) => PLACEMENT_LABELS[slot.placement])
                .join(" + ")}`}
              onChange={(event) => updateQuoteField("projectDetails", event.target.value)}
              className={inputClassName}
            />
          </div>

          {!turnstileDevBypass && (
            <div className="space-y-2">
              <TurnstileWidget
                key={turnstileWidgetKey}
                ref={turnstileRef}
                onTokenChange={handleTurnstileTokenChange}
                onExpire={handleTurnstileExpire}
                onError={handleTurnstileError}
              />
              <p
                className={`text-sm ${
                  isTurnstileSubmitReady(turnstileToken)
                    ? "text-emerald-700"
                    : turnstileExpired
                      ? "text-amber-700"
                      : "text-muted"
                }`}
              >
                {turnstileStatusText}
              </p>
            </div>
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
