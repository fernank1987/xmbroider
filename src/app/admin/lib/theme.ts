export const ADMIN_THEME_STORAGE_KEY = "xmbroider-admin-theme";

export type AdminTheme = "light" | "dark";

export const ADMIN_THEMES: AdminTheme[] = ["light", "dark"];

export function isAdminTheme(value: string | null | undefined): value is AdminTheme {
  return value === "light" || value === "dark";
}

export function getStoredAdminTheme(): AdminTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  return isAdminTheme(stored) ? stored : "light";
}
