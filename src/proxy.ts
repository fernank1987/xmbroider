import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * App Hosting does not pass the custom domain as `Host` (Cloud Run service URL
 * is used instead). Copy `x-forwarded-host` onto `Host` so Next.js request URL
 * construction, redirects, and any `headers.get("host")` reads see the public
 * hostname. No-op when the forwarded header is absent (Vercel, `next dev`).
 *
 * Next.js 16.2: `proxy.ts` replaces deprecated `middleware.ts`.
 */
export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!forwardedHost) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("host", forwardedHost);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
