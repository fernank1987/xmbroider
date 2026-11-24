/** First value from a possibly comma-separated forwarded header. */
function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

/**
 * Hostname the client used.
 *
 * Firebase App Hosting / Cloud Run set `Host` to the Cloud Run service URL and
 * put the custom domain (or `*.hosted.app` URL) on `x-forwarded-host`. Prefer
 * that header, then fall back to `Host` (Vercel and local `next dev`).
 */
export function getRequestHost(headers: Headers): string | null {
  return (
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"))
  );
}

/** Protocol the client used (`https` on App Hosting / Vercel). */
export function getRequestProtocol(
  headers: Headers,
  fallback = "https",
): string {
  return firstHeaderValue(headers.get("x-forwarded-proto")) ?? fallback;
}

/** Origin built from x-forwarded-* (or Host) rather than Cloud Run's Host. */
export function getRequestOrigin(headers: Headers): string | null {
  const host = getRequestHost(headers);
  if (!host) {
    return null;
  }
  return `${getRequestProtocol(headers)}://${host}`;
}

/**
 * `request.url` rewritten so `origin` / `host` match the public hostname.
 * Search params are unchanged.
 */
export function getRequestUrl(request: Request): URL {
  const url = new URL(request.url);
  const host = getRequestHost(request.headers);
  const proto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  if (host) {
    url.host = host;
  }
  if (proto) {
    url.protocol = `${proto}:`;
  }
  return url;
}
