import { getAdminAuth } from "./firebase/admin";
import { isAdminEmailAllowed } from "@/app/admin/lib/adminAllowlist";

export type AdminAuthSuccess = {
  uid: string;
  email: string;
};

export type AdminAuthFailure = {
  error: string;
  status: 401 | 403 | 503;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

const LOG_PREFIX = "[admin-auth]";

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

/** Verifies Firebase ID token and admin email allowlist for server routes. */
export async function verifyAdminRequest(
  request: Request,
  options?: { logPrefix?: string },
): Promise<AdminAuthResult> {
  const logPrefix = options?.logPrefix ?? LOG_PREFIX;
  const idToken = readBearerToken(request);
  if (!idToken) {
    console.warn(`${logPrefix} missing authorization token`);
    return { error: "Missing authorization token.", status: 401 };
  }

  const auth = await getAdminAuth();
  if (!auth) {
    console.error(`${logPrefix} admin auth SDK unavailable`);
    return { error: "Admin server is not configured.", status: 503 };
  }

  console.log(`${logPrefix} admin auth loaded`);

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email;
    console.log(`${logPrefix} decoded email`, email ?? "(none)");

    if (!email || !isAdminEmailAllowed(email)) {
      console.warn(`${logPrefix} allowlist denied`, email ?? "(none)");
      return { error: "You do not have admin access.", status: 403 };
    }

    console.log(`${logPrefix} allowlist passed`);
    return {
      uid: decoded.uid,
      email,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Invalid or expired authorization token.";
    console.warn(`${logPrefix} token verification failed`, message);
    return { error: "Invalid or expired authorization token.", status: 401 };
  }
}

export function isAdminAuthFailure(result: AdminAuthResult): result is AdminAuthFailure {
  return "error" in result;
}
