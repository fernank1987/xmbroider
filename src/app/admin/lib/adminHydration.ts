"use client";

import { useSyncExternalStore } from "react";
import { syncAdminThemeFromStorage } from "./adminThemeStore";

const hydrationListeners = new Set<() => void>();
let isAdminHydrated = false;

function subscribeAdminHydration(listener: () => void) {
  hydrationListeners.add(listener);

  if (typeof window !== "undefined") {
    queueMicrotask(() => {
      if (!isAdminHydrated) {
        isAdminHydrated = true;
        syncAdminThemeFromStorage();
        hydrationListeners.forEach((notify) => notify());
      }
    });
  }

  return () => {
    hydrationListeners.delete(listener);
  };
}

function getAdminHydrationSnapshot() {
  return isAdminHydrated;
}

function getAdminHydrationServerSnapshot() {
  return false;
}

/** True only after the first client render completes hydration. */
export function useAdminHydrated() {
  return useSyncExternalStore(
    subscribeAdminHydration,
    getAdminHydrationSnapshot,
    getAdminHydrationServerSnapshot,
  );
}
