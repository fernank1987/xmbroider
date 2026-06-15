/** Comma-separated admin emails from NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST */
function getAdminEmailAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** When no allowlist is configured, any authenticated Firebase user may access admin. */
export function isAdminEmailAllowlistConfigured(): boolean {
  return getAdminEmailAllowlist().length > 0;
}

export function isAdminEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const allowlist = getAdminEmailAllowlist();
  if (allowlist.length === 0) {
    return true;
  }

  return allowlist.includes(email.trim().toLowerCase());
}
