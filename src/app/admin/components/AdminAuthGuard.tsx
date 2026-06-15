"use client";

import AdminAccessDenied from "./AdminAccessDenied";
import AdminFirebaseSetupNotice from "./AdminFirebaseSetupNotice";
import AdminStableLoadingCard from "./AdminStableLoadingCard";
import { useAdminAuth } from "./AdminAuthProvider";
import { useAdminHydrated } from "../lib/adminHydration";
import { useAdminSafeRedirect } from "../lib/adminNavigation";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured, isAllowed } = useAdminAuth();
  const hydrated = useAdminHydrated();

  const shouldRedirectToLogin =
    hydrated && isConfigured && !loading && !user;

  useAdminSafeRedirect(shouldRedirectToLogin, "/admin/login");

  if (!hydrated) {
    return <AdminStableLoadingCard message="Loading admin…" />;
  }

  if (!isConfigured) {
    return <AdminFirebaseSetupNotice context="protected" />;
  }

  if (loading) {
    return <AdminStableLoadingCard message="Checking admin session…" />;
  }

  if (!user) {
    return <AdminStableLoadingCard message="Redirecting to login…" />;
  }

  if (!isAllowed) {
    return <AdminAccessDenied />;
  }

  return children;
}
