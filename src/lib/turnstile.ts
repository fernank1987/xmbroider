const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_DEV_BYPASS_TOKEN = "dev-bypass";

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; message: string; expired?: boolean };

type TurnstileSiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export function getTurnstileSecretKey(): string | undefined {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || undefined;
}

export function isTurnstileSecretConfigured(): boolean {
  return Boolean(getTurnstileSecretKey());
}

/** Development-only bypass when Turnstile secret is not configured. */
export function isTurnstileDevBypassToken(token: string): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !isTurnstileSecretConfigured() &&
    token === TURNSTILE_DEV_BYPASS_TOKEN
  );
}

export function isTurnstileRequiredInProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function mapTurnstileErrorCodes(errorCodes: string[]): TurnstileVerifyResult {
  if (
    errorCodes.includes("timeout-or-duplicate") ||
    errorCodes.includes("invalid-input-response")
  ) {
    return {
      ok: false,
      expired: true,
      message: "The anti-spam check expired. Please try again.",
    };
  }

  if (errorCodes.includes("missing-input-response")) {
    return {
      ok: false,
      message: "Please complete the anti-spam check before submitting.",
    };
  }

  return {
    ok: false,
    message: "The anti-spam check could not be verified. Please try again.",
  };
}

/** Verifies a Turnstile token with Cloudflare Siteverify. */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResult> {
  if (isTurnstileDevBypassToken(token)) {
    return { ok: true };
  }

  const secret = getTurnstileSecretKey();
  if (!secret) {
    if (isTurnstileRequiredInProduction()) {
      return {
        ok: false,
        message: "Quote submissions are temporarily unavailable. Please contact us directly.",
      };
    }
    return {
      ok: false,
      message: "Turnstile is not configured for this environment.",
    };
  }

  if (!token.trim()) {
    return {
      ok: false,
      message: "Please complete the anti-spam check before submitting.",
    };
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: "The anti-spam check could not be verified. Please try again.",
      };
    }

    const result = (await response.json()) as TurnstileSiteverifyResponse;
    if (result.success) {
      return { ok: true };
    }

    return mapTurnstileErrorCodes(result["error-codes"] ?? []);
  } catch {
    return {
      ok: false,
      message: "The anti-spam check could not be verified. Please try again.",
    };
  }
}
