import type { PreviewCalibrationSource } from "@/lib/previewCalibration";
import type {
  CreateQuoteRequestInput,
  QuoteLogoPlacement,
  QuoteRequestSource,
} from "@/lib/firebase/quoteRepository";
import { QUOTE_REQUEST_SOURCES } from "@/lib/firebase/quoteRepository";
import {
  type EmbroideryEstimateResult,
  parsePriceEstimate,
} from "@/lib/pricing/embroideryEstimator";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isQuoteRequestSource(value: string): value is QuoteRequestSource {
  return (QUOTE_REQUEST_SOURCES as readonly string[]).includes(value);
}

function isPreviewCalibrationSource(value: unknown): PreviewCalibrationSource | null {
  if (
    value === "custom-color" ||
    value === "product-default" ||
    value === "category-default"
  ) {
    return value;
  }
  return null;
}

function parseLogoPlacement(value: unknown): QuoteLogoPlacement | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const data = value as Record<string, unknown>;
  const label = readString(data.label);
  const artworkUrl = readString(data.artworkUrl);
  const artworkStoragePath = readString(data.artworkStoragePath);
  const placement = readString(data.placement);
  const logoWidthMm = readNumber(data.logoWidthMm);
  const logoWidthInches = readNumber(data.logoWidthInches);
  const positionPercentX = readNumber(data.positionPercentX);
  const positionPercentY = readNumber(data.positionPercentY);

  if (
    !label ||
    !artworkUrl ||
    !artworkStoragePath ||
    !placement ||
    logoWidthMm === null ||
    logoWidthInches === null ||
    positionPercentX === null ||
    positionPercentY === null
  ) {
    return null;
  }

  return {
    label,
    artworkUrl,
    artworkStoragePath,
    placement,
    logoWidthMm,
    logoWidthInches,
    estimatedLogoHeightMm: readNumber(data.estimatedLogoHeightMm),
    positionPercentX,
    positionPercentY,
    sizePresetLabel: readString(data.sizePresetLabel),
  };
}

function parseLogoPlacements(value: unknown): QuoteLogoPlacement[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const placements = value
    .map(parseLogoPlacement)
    .filter((entry): entry is QuoteLogoPlacement => entry !== null);

  return placements.length > 0 ? placements : undefined;
}

function parsePriceEstimateFromRequest(value: unknown): EmbroideryEstimateResult | undefined {
  const parsed = parsePriceEstimate(value);
  return parsed ?? undefined;
}

function parsePreviewInput(
  value: unknown,
): NonNullable<CreateQuoteRequestInput["preview"]> | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "Preview submission is missing artwork and placement details." };
  }

  const data = value as Record<string, unknown>;
  const productId = readString(data.productId);
  const productName = readString(data.productName);
  const productType = readString(data.productType);
  const productLabel = readString(data.productLabel);
  const productVariantId = readString(data.productVariantId);
  const colorName = readString(data.colorName);
  const placement = readString(data.placement);
  const logoSize = readNumber(data.logoSize);
  const logoWidthMm = readNumber(data.logoWidthMm);
  const logoWidthInches = readNumber(data.logoWidthInches);
  const productPhysicalWidthMm = readNumber(data.productPhysicalWidthMm);
  const sizePresetLabel = readString(data.sizePresetLabel);
  const logoPositionX = readNumber(data.logoPositionX);
  const logoPositionY = readNumber(data.logoPositionY);
  const artworkUrl = readString(data.artworkUrl);
  const artworkStoragePath = readString(data.artworkStoragePath);

  if (
    !productId ||
    !productName ||
    !productType ||
    !productLabel ||
    !productVariantId ||
    !colorName ||
    !placement ||
    logoSize === null ||
    logoWidthMm === null ||
    logoWidthInches === null ||
    productPhysicalWidthMm === null ||
    !sizePresetLabel ||
    logoPositionX === null ||
    logoPositionY === null ||
    !artworkUrl ||
    !artworkStoragePath
  ) {
    return { error: "Preview submission is missing artwork and placement details." };
  }

  return {
    productId,
    productName,
    productType,
    productLabel,
    productVariantId,
    colorName,
    size: readString(data.size),
    productImageUrl: readString(data.productImageUrl),
    placement,
    logoSize,
    logoWidthMm,
    logoWidthInches,
    estimatedLogoHeightMm: readNumber(data.estimatedLogoHeightMm),
    productPhysicalWidthMm,
    sizePresetLabel,
    previewCalibrationUsed: readBoolean(data.previewCalibrationUsed) ?? undefined,
    previewCalibrationSource: isPreviewCalibrationSource(data.previewCalibrationSource) ?? undefined,
    productBrand: readString(data.productBrand),
    productMaterial: readString(data.productMaterial),
    decorationMethod: readString(data.decorationMethod),
    logoPositionX,
    logoPositionY,
    artworkUrl,
    artworkStoragePath,
    previewImageUrl: readString(data.previewImageUrl),
    previewImageStoragePath: readString(data.previewImageStoragePath),
    previewCompositeUrl: readString(data.previewCompositeUrl),
    previewCompositeStoragePath: readString(data.previewCompositeStoragePath),
    previewCompositeExportError: readString(data.previewCompositeExportError),
    logoPlacements: parseLogoPlacements(data.logoPlacements),
  };
}

export function parseCreateQuoteRequestInput(
  value: unknown,
): { input: CreateQuoteRequestInput } | { error: string } {
  if (typeof value !== "object" || value === null) {
    return { error: "Invalid quote request payload." };
  }

  const data = value as Record<string, unknown>;
  const name = readString(data.name);
  const email = readString(data.email);
  const serviceNeeded = readString(data.serviceNeeded);
  const projectDetails = readString(data.projectDetails);
  const sourceValue = readString(data.source);
  const source = sourceValue && isQuoteRequestSource(sourceValue) ? sourceValue : undefined;

  if (!name || !email || !serviceNeeded || !projectDetails) {
    return { error: "Missing required quote fields." };
  }

  const input: CreateQuoteRequestInput = {
    name,
    email,
    phone: readString(data.phone) ?? undefined,
    serviceNeeded,
    projectDetails,
    quantity: readString(data.quantity) ?? undefined,
    deadline: readString(data.deadline) ?? undefined,
    source,
  };

  if (data.preview !== undefined) {
    const previewResult = parsePreviewInput(data.preview);
    if ("error" in previewResult) {
      return previewResult;
    }
    input.preview = previewResult;
    input.source = "logo_preview_tool";
  }

  const priceEstimate = parsePriceEstimateFromRequest(data.priceEstimate);
  if (priceEstimate) {
    input.priceEstimate = priceEstimate;
  }

  return { input };
}
