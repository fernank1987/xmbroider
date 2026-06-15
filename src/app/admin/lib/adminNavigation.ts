"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminHydrated } from "./adminHydration";

/**
 * Defers App Router navigation until after hydration and the router is ready.
 * Never call router.replace/push during render.
 */
export function useAdminSafeRedirect(shouldRedirect: boolean, href: string) {
  const router = useRouter();
  const hydrated = useAdminHydrated();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !shouldRedirect) {
      hasRedirectedRef.current = false;
      return;
    }

    if (hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;

    const timeoutId = window.setTimeout(() => {
      router.replace(href);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hydrated, shouldRedirect, href, router]);
}
