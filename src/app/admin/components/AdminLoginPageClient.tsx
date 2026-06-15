"use client";

import AdminAccessDenied from "./AdminAccessDenied";
import AdminFirebaseSetupNotice from "./AdminFirebaseSetupNotice";
import { AdminLoginForm } from "./AdminAuthActions";
import AdminStableLoadingCard from "./AdminStableLoadingCard";
import AdminThemeToggle from "./AdminThemeToggle";
import { useAdminAuth } from "./AdminAuthProvider";
import { useAdminHydrated } from "../lib/adminHydration";
import { useAdminSafeRedirect } from "../lib/adminNavigation";
import { adminHeader, adminTitle } from "../lib/adminStyles";

export default function AdminLoginPageClient() {
  const { user, loading, isConfigured, isAllowed } = useAdminAuth();
  const hydrated = useAdminHydrated();

  const shouldRedirectToAdmin =
    hydrated && isConfigured && !loading && !!user && isAllowed;

  useAdminSafeRedirect(shouldRedirectToAdmin, "/admin");

  if (!hydrated) {
    return <AdminStableLoadingCard message="Loading login…" />;
  }

  if (!isConfigured) {
    return <AdminFirebaseSetupNotice context="login" />;
  }

  if (loading) {
    return <AdminStableLoadingCard message="Checking admin session…" />;
  }

  if (user && !isAllowed) {
    return <AdminAccessDenied />;
  }

  if (user && isAllowed) {
    return <AdminStableLoadingCard message="Redirecting to dashboard…" />;
  }

  return (
    <>
      <header
        className={`${adminHeader} flex items-center justify-between px-6 py-6 lg:px-8`}
      >
        <h1 className={adminTitle}>XMBroider Admin</h1>
        <AdminThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
        <AdminLoginForm />
      </div>
    </>
  );
}
