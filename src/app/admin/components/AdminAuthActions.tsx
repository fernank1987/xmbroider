"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAdminAuth } from "./AdminAuthProvider";
import {
  adminBodyText,
  adminCard,
  adminInput,
  adminLabel,
  adminNotice,
  adminSectionTitle,
  adminThemeToggle,
} from "../lib/adminStyles";

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("auth/invalid-credential")) {
      return "Invalid email or password.";
    }
    if (error.message.includes("auth/invalid-email")) {
      return "Enter a valid email address.";
    }
    if (error.message.includes("auth/too-many-requests")) {
      return "Too many attempts. Try again later.";
    }
    return error.message;
  }
  return "Unable to sign in. Please try again.";
}

export default function AdminLogoutButton({
  className = "",
}: {
  className?: string;
}) {
  const { signOut } = useAdminAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await signOut();
      window.location.assign("/admin/login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={submitting}
      className={
        className
          ? `${adminThemeToggle} ${className}`
          : adminThemeToggle
      }
    >
      {submitting ? "Signing out…" : "Log out"}
    </button>
  );
}

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!auth) {
      setError("Firebase Auth is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${adminCard} max-w-md space-y-5 p-8`}>
      <div>
        <h1 className={`${adminSectionTitle} text-xl`}>Admin login</h1>
        <p className={`mt-2 ${adminBodyText}`}>
          Sign in with your Firebase email/password account.
        </p>
      </div>

      <div>
        <label htmlFor="admin-email" className={adminLabel}>
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={adminInput}
        />
      </div>

      <div>
        <label htmlFor="admin-password" className={adminLabel}>
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={adminInput}
        />
      </div>

      {error && (
        <div className={`${adminNotice} border-red-200 bg-red-50 text-red-800 admin-dark:border-red-500/30 admin-dark:bg-red-500/10 admin-dark:text-red-200`}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60 admin-dark:bg-amber-600 admin-dark:hover:bg-amber-500`}
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
