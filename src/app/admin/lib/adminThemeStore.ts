"use client";

import {
  ADMIN_THEME_STORAGE_KEY,
  getStoredAdminTheme,
  isAdminTheme,
  type AdminTheme,
} from "./theme";

const themeListeners = new Set<() => void>();

let activeTheme: AdminTheme = "light";
let themeInitialized = false;

export function subscribeAdminTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function getAdminThemeSnapshot(): AdminTheme {
  if (typeof window === "undefined" || !themeInitialized) {
    return "light";
  }
  return activeTheme;
}

export function getAdminThemeServerSnapshot(): AdminTheme {
  return "light";
}

export function syncAdminThemeFromStorage() {
  if (themeInitialized) {
    return;
  }
  activeTheme = getStoredAdminTheme();
  themeInitialized = true;
  themeListeners.forEach((listener) => listener());
}

export function persistAdminTheme(theme: AdminTheme) {
  if (!isAdminTheme(theme)) {
    return;
  }
  activeTheme = theme;
  themeInitialized = true;
  localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  themeListeners.forEach((listener) => listener());
}

export function toggleAdminTheme() {
  const currentTheme = getAdminThemeSnapshot();
  persistAdminTheme(currentTheme === "light" ? "dark" : "light");
}
