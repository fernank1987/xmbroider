"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import AdminSidebar from "./AdminSidebar";
import {
  ADMIN_THEME_STORAGE_KEY,
  getStoredAdminTheme,
  isAdminTheme,
  type AdminTheme,
} from "../lib/theme";
import { adminShell } from "../lib/adminStyles";

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function getThemeSnapshot(): AdminTheme {
  return getStoredAdminTheme();
}

function getThemeServerSnapshot(): AdminTheme {
  return "light";
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function persistTheme(theme: AdminTheme) {
  localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  notifyThemeListeners();
}

export function useAdminTheme(): AdminThemeContextValue {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return context;
}

export default function AdminThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  const setTheme = useCallback((nextTheme: AdminTheme) => {
    if (!isAdminTheme(nextTheme)) {
      return;
    }
    persistTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    persistTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        className={`${adminShell} ${theme === "dark" ? "admin-dark" : ""}`}
        data-admin-theme={theme}
        suppressHydrationWarning
      >
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
}
