"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAdminHydrated } from "../lib/adminHydration";
import {
  getAdminThemeServerSnapshot,
  getAdminThemeSnapshot,
  persistAdminTheme,
  subscribeAdminTheme,
  toggleAdminTheme,
} from "../lib/adminThemeStore";
import { type AdminTheme } from "../lib/theme";

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

const adminShellLight =
  "min-h-screen bg-slate-50 text-slate-900 admin-dark:bg-zinc-950 admin-dark:text-zinc-100";

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
  const hydrated = useAdminHydrated();
  const theme = useSyncExternalStore(
    subscribeAdminTheme,
    getAdminThemeSnapshot,
    getAdminThemeServerSnapshot,
  );

  const setTheme = useCallback((nextTheme: AdminTheme) => {
    persistAdminTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    toggleAdminTheme();
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted: hydrated }),
    [theme, setTheme, toggleTheme, hydrated],
  );

  const isDark = hydrated && theme === "dark";

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        className={`${adminShellLight} ${isDark ? "admin-dark" : ""}`}
        data-admin-theme={hydrated ? theme : "light"}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
