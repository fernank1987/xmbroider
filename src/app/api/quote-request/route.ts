import { NextResponse } from "next/server";
import { buildQuoteNotificationPayload } from "@/lib/quoteNotificationClient";
import { sendQuoteNotificationForPayload } from "@/lib/quoteNotificationServer";
import { createQuoteRequestAdmin } from "@/lib/firebase/quoteAdminRepository";
import { validateCreateQuoteRequestInput } from "@/lib/firebase/quoteRepository";
import { parseCreateQuoteRequestInput } from "@/lib/quoteRequestApi";
import { verifyTurnstileToken } from "@/lib/turnstile";

// TODO: Add rate limiting (e.g. per-IP throttle) before production scale.

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
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
  const quoteRequestId = readString(data.quoteRequestId) ?? undefined;

  if (!siteId) {
    return NextResponse.json({ error: "Missing site id." }, { status: 400 });
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

  const parsedQuote = parseCreateQuoteRequestInput(data.quote);
  if ("error" in parsedQuote) {
    return NextResponse.json({ error: parsedQuote.error }, { status: 400 });
  }

  const validationError = validateCreateQuoteRequestInput(parsedQuote.input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let created;
  try {
    created = await createQuoteRequestAdmin(siteId, parsedQuote.input, { quoteRequestId });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to save your quote request. Please try again.";

    if (process.env.NODE_ENV === "development") {
      console.warn("[quote-request] create failed:", message);
    }

    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[quote-request] created", {
      quoteId: created.id,
      source: created.source,
    });
  }

  void sendQuoteNotificationForPayload(buildQuoteNotificationPayload(siteId, created));

  return NextResponse.json({
    ok: true,
    quoteId: created.id,
  });
}
