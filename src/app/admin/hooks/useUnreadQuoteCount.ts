"use client";

import { useEffect, useState } from "react";
import { listQuoteRequests } from "@/lib/firebase/quoteRepository";
import { countUnreadQuotes } from "@/lib/quoteUnread";
import { siteContent } from "@/lib/siteContent";
import { isFirebaseConfigured } from "@/lib/firebase/client";

const SITE_ID = siteContent.siteId;

export function useUnreadQuoteCount(): number | null {
  const [count, setCount] = useState<number | null>(() =>
    isFirebaseConfigured ? null : 0,
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const quotes = await listQuoteRequests(SITE_ID);
        if (!cancelled) {
          setCount(countUnreadQuotes(quotes));
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return count;
}
