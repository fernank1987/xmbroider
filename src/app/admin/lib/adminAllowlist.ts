/**
 * Comma-separated admin emails.
 *
 * Canonical name: NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST
 * Vercel-period fallback: NEXT_PUBLIC_ADMIN_EMAILS (the name currently set on
 * Vercel). App Hosting should only set the canonical name.
 */
function getAdminEmailAllowlist(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST?.trim() ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** True when at least one admin email is configured. */
export function isAdminEmailAllowlistConfigured(): boolean {
  return getAdminEmailAllowlist().length > 0;
}

/**
 * Fail closed: if the allowlist is empty or unset, no email is admin.
 * An unset allowlist previously treated every signed-in Firebase user as admin.
 */
export function isAdminEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const allowlist = getAdminEmailAllowlist();
  if (allowlist.length === 0) {
    return false;
  }

  return allowlist.includes(email.trim().toLowerCase());
}
