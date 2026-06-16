import { NextResponse } from "next/server";
import {
  generateServerCompositePreview,
  isMockupSide,
  isPlacement,
  parsePreviewCalibration,
  uploadServerCompositePreview,
  type ServerCompositeLogoInput,
} from "@/lib/previewCompositeServer";
import { verifyTurnstileToken } from "@/lib/turnstile";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

function parseLogoInput(value: unknown): ServerCompositeLogoInput | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = readString(record.label);
  const artworkUrl = readString(record.artworkUrl);
  const placement = readString(record.placement);
  const logoWidthMm = readNumber(record.logoWidthMm);
  const logoGarmentPositionX = readNumber(record.logoGarmentPositionX);
  const logoGarmentPositionY = readNumber(record.logoGarmentPositionY);
  const calibration = parsePreviewCalibration(record.calibration);

  if (
    !label ||
    !artworkUrl ||
    !placement ||
    !isPlacement(placement) ||
    logoWidthMm === null ||
    logoGarmentPositionX === null ||
    logoGarmentPositionY === null ||
    !calibration
  ) {
    return null;
  }

  return {
    label,
    artworkUrl,
    placement,
    logoWidthMm,
    logoGarmentPositionX,
    logoGarmentPositionY,
    calibration,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const siteId = readString(data.siteId);
  const turnstileToken = readString(data.turnstileToken);
  const quoteRequestId = readString(data.quoteRequestId);
  const productImageUrl = readString(data.productImageUrl);
  const mockupSideValue = readString(data.mockupSide);
  const fallbackSwatchColor = readString(data.fallbackSwatchColor) ?? undefined;
  const baseCalibration = parsePreviewCalibration(data.baseCalibration);

  if (!siteId || !quoteRequestId) {
    return NextResponse.json({ error: "Missing site id or quote request id." }, { status: 400 });
  }

  if (!turnstileToken) {
    return NextResponse.json(
      { error: "Please complete the anti-spam check before submitting." },
      { status: 400 },
    );
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken, getClientIp(request));
  if (!turnstileResult.ok) {
    return NextResponse.json(
      { error: turnstileResult.message },
      { status: turnstileResult.expired ? 403 : 400 },
    );
  }

  if (!mockupSideValue || !isMockupSide(mockupSideValue)) {
    return NextResponse.json({ error: "Invalid mockup side." }, { status: 400 });
  }

  if (!baseCalibration) {
    return NextResponse.json({ error: "Missing preview calibration." }, { status: 400 });
  }

  if (!Array.isArray(data.logos) || data.logos.length === 0) {
    return NextResponse.json({ error: "At least one logo is required." }, { status: 400 });
  }

  const logos = data.logos
    .map(parseLogoInput)
    .filter((entry): entry is ServerCompositeLogoInput => entry !== null);

  if (logos.length === 0) {
    return NextResponse.json({ error: "Invalid logo overlay data." }, { status: 400 });
  }

  const composite = await generateServerCompositePreview({
    siteId,
    quoteRequestId,
    productImageUrl,
    mockupSide: mockupSideValue,
    fallbackSwatchColor,
    baseCalibration,
    logos,
  });

  if (!composite.buffer) {
    return NextResponse.json(
      {
        error: composite.exportNote ?? "Composite preview could not be generated.",
        exportNote: composite.exportNote,
        errors: composite.errors,
      },
      { status: 503 },
    );
  }

  try {
    const upload = await uploadServerCompositePreview(siteId, quoteRequestId, composite.buffer);

    if (process.env.NODE_ENV === "development") {
      console.log("[preview-composite] generated", {
        quoteRequestId,
        usedProductPhoto: composite.usedProductPhoto,
        logoCount: logos.length,
        errors: composite.errors,
      });
    }

    return NextResponse.json({
      ok: true,
      ...upload,
      usedProductPhoto: composite.usedProductPhoto,
      approximateFallback: composite.approximateFallback,
      exportNote: composite.exportNote,
      errors: composite.errors,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to upload composite preview.";

    return NextResponse.json(
      {
        error: message,
        exportNote: message,
        errors: [...composite.errors, message],
      },
      { status: 503 },
    );
  }
}
