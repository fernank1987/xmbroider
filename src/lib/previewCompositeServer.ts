import { randomUUID } from "crypto";
import sharp from "sharp";
import { getAdminStorageBucket } from "./firebase/admin";
import { getQuoteUploadStoragePath } from "./firebase/storageRepository";
import type { Placement } from "./logoPreview";
import type { PreviewCalibration } from "./previewCalibration";
import { APPROXIMATE_MOCKUP_WARNING } from "./productMockupImage";
import type { MockupImageSide } from "./productMockupImage";
import {
  computeContainedDrawRect,
  computeFallbackGarmentDrawRect,
  computeLogoOverlayRect,
  logoMatchesMockupSide,
  PREVIEW_EXPORT_HEIGHT,
  PREVIEW_EXPORT_WIDTH,
  type LogoOverlayDrawInput,
} from "./previewCompositeMath";

export type ServerCompositeLogoInput = LogoOverlayDrawInput & {
  label: string;
  artworkUrl: string;
};

export type GenerateServerCompositeInput = {
  siteId: string;
  quoteRequestId: string;
  productImageUrl: string | null;
  mockupSide: MockupImageSide;
  fallbackSwatchColor?: string;
  baseCalibration: PreviewCalibration;
  logos: ServerCompositeLogoInput[];
};

export type GenerateServerCompositeResult = {
  buffer: Buffer | null;
  usedProductPhoto: boolean;
  approximateFallback: boolean;
  exportNote: string | null;
  errors: string[];
};

export type UploadServerCompositeResult = {
  previewImageUrl: string;
  previewImageStoragePath: string;
  previewCompositeUrl: string;
  previewCompositeStoragePath: string;
};

const ADMIN_DISABLED_MESSAGE =
  "Server composite export is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON.";

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return { r: 219, g: 234, b: 254 };
}

async function fetchImageBuffer(
  url: string,
  label: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const response = await fetch(url, {
    headers: { Accept: "image/*" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status} fetching ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`${label}: image dimensions unavailable (${url})`);
  }

  return { buffer, width: metadata.width, height: metadata.height };
}

async function createFallbackProductLayer(
  swatchColor: string,
  calibration: PreviewCalibration,
): Promise<Buffer> {
  const width = PREVIEW_EXPORT_WIDTH;
  const height = PREVIEW_EXPORT_HEIGHT;
  const bounds = calibration.garmentBounds;
  const shirtX = Math.round(bounds.x * width);
  const shirtY = Math.round(bounds.y * height);
  const shirtWidth = Math.round(bounds.width * width);
  const shirtHeight = Math.round(bounds.height * height);
  const color = parseHexColor(swatchColor);

  const shirt = await sharp({
    create: {
      width: shirtWidth,
      height: shirtHeight,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 248, g: 250, b: 252, alpha: 1 },
    },
  })
    .composite([{ input: shirt, left: shirtX, top: shirtY }])
    .png()
    .toBuffer();
}

function buildFirebaseDownloadUrl(bucketName: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** Generates a composite preview PNG on the server (no browser CORS). */
export async function generateServerCompositePreview(
  input: GenerateServerCompositeInput,
): Promise<GenerateServerCompositeResult> {
  const errors: string[] = [];
  let usedProductPhoto = false;
  let drawRect: { x: number; y: number; width: number; height: number };
  const compositeLayers: sharp.OverlayOptions[] = [];

  if (input.productImageUrl) {
    try {
      const product = await fetchImageBuffer(input.productImageUrl, "Product photo");
      drawRect = computeContainedDrawRect(
        PREVIEW_EXPORT_WIDTH,
        PREVIEW_EXPORT_HEIGHT,
        product.width,
        product.height,
      );

      const productLayer = await sharp(product.buffer)
        .resize(Math.round(drawRect.width), Math.round(drawRect.height), { fit: "fill" })
        .png()
        .toBuffer();

      compositeLayers.push({
        input: productLayer,
        left: Math.round(drawRect.x),
        top: Math.round(drawRect.y),
      });
      usedProductPhoto = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Product photo could not be loaded.";
      errors.push(message);
      if (process.env.NODE_ENV === "development") {
        console.warn("[preview-composite] product photo failed:", message);
      }

      const fallbackLayer = await createFallbackProductLayer(
        input.fallbackSwatchColor ?? "#dbeafe",
        input.baseCalibration,
      );
      compositeLayers.push({ input: fallbackLayer, left: 0, top: 0 });
      drawRect = computeFallbackGarmentDrawRect(
        PREVIEW_EXPORT_WIDTH,
        PREVIEW_EXPORT_HEIGHT,
        input.baseCalibration,
      );
    }
  } else {
    errors.push("Product photo URL is missing.");
    const fallbackLayer = await createFallbackProductLayer(
      input.fallbackSwatchColor ?? "#dbeafe",
      input.baseCalibration,
    );
    compositeLayers.push({ input: fallbackLayer, left: 0, top: 0 });
    drawRect = computeFallbackGarmentDrawRect(
      PREVIEW_EXPORT_WIDTH,
      PREVIEW_EXPORT_HEIGHT,
      input.baseCalibration,
    );
  }

  const visibleLogos = input.logos.filter((logo) =>
    logoMatchesMockupSide(logo.placement, input.mockupSide),
  );

  for (const logo of visibleLogos) {
    try {
      const artwork = await fetchImageBuffer(logo.artworkUrl, logo.label);
      const overlayRect = computeLogoOverlayRect(
        drawRect,
        logo,
        artwork.width,
        artwork.height,
      );

      const logoLayer = await sharp(artwork.buffer)
        .resize(Math.round(overlayRect.width), Math.round(overlayRect.height), {
          fit: "fill",
        })
        .png()
        .toBuffer();

      compositeLayers.push({
        input: logoLayer,
        left: Math.round(overlayRect.left),
        top: Math.round(overlayRect.top),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${logo.label}: artwork could not be loaded.`;
      errors.push(message);
      if (process.env.NODE_ENV === "development") {
        console.warn("[preview-composite] logo failed:", message);
      }
    }
  }

  try {
    const buffer = await sharp({
      create: {
        width: PREVIEW_EXPORT_WIDTH,
        height: PREVIEW_EXPORT_HEIGHT,
        channels: 4,
        background: { r: 248, g: 250, b: 252, alpha: 1 },
      },
    })
      .composite(compositeLayers)
      .png()
      .toBuffer();

    const approximateFallback = !usedProductPhoto;
    let exportNote: string | null = null;
    if (approximateFallback) {
      exportNote = errors[0] ?? APPROXIMATE_MOCKUP_WARNING;
    } else if (errors.length > 0) {
      exportNote = errors.join(" ");
    }

    return {
      buffer,
      usedProductPhoto,
      approximateFallback,
      exportNote,
      errors,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Composite preview encoding failed.";
    return {
      buffer: null,
      usedProductPhoto,
      approximateFallback: !usedProductPhoto,
      exportNote: message,
      errors: [...errors, message],
    };
  }
}

/** Uploads composite preview PNG to Storage via Admin SDK. */
export async function uploadServerCompositePreview(
  siteId: string,
  quoteRequestId: string,
  buffer: Buffer,
): Promise<UploadServerCompositeResult> {
  const bucket = getAdminStorageBucket();
  if (!bucket) {
    throw new Error(ADMIN_DISABLED_MESSAGE);
  }

  const previewFileName = "preview.png";
  const compositeFileName = "preview-composite.png";
  const previewPath = getQuoteUploadStoragePath(siteId, quoteRequestId, previewFileName);
  const compositePath = getQuoteUploadStoragePath(siteId, quoteRequestId, compositeFileName);
  const previewToken = randomUUID();
  const compositeToken = randomUUID();

  await bucket.file(previewPath).save(buffer, {
    contentType: "image/png",
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: previewToken,
      },
    },
  });

  await bucket.file(compositePath).save(buffer, {
    contentType: "image/png",
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: compositeToken,
      },
    },
  });

  const previewImageUrl = buildFirebaseDownloadUrl(bucket.name, previewPath, previewToken);
  const previewCompositeUrl = buildFirebaseDownloadUrl(bucket.name, compositePath, compositeToken);

  return {
    previewImageUrl,
    previewImageStoragePath: previewPath,
    previewCompositeUrl,
    previewCompositeStoragePath: compositePath,
  };
}

export function isPlacement(value: string): value is Placement {
  return [
    "left_chest",
    "right_chest",
    "center_chest",
    "sleeve",
    "back",
    "hat_front",
  ].includes(value);
}

export function isMockupSide(value: string): value is MockupImageSide {
  return value === "front" || value === "back";
}

export function parsePreviewCalibration(value: unknown): PreviewCalibration | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const garmentBounds = record.garmentBounds;
  const physicalWidthMm = record.physicalWidthMm;

  if (typeof garmentBounds !== "object" || garmentBounds === null) {
    return null;
  }

  const bounds = garmentBounds as Record<string, unknown>;
  if (
    typeof bounds.x !== "number" ||
    typeof bounds.y !== "number" ||
    typeof bounds.width !== "number" ||
    typeof bounds.height !== "number" ||
    typeof physicalWidthMm !== "number"
  ) {
    return null;
  }

  return {
    garmentBounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    physicalWidthMm,
    physicalHeightMm:
      typeof record.physicalHeightMm === "number" ? record.physicalHeightMm : undefined,
  };
}
