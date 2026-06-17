import { isAdminEmailAllowed } from "@/app/admin/lib/adminAllowlist";
import {
  FirebaseIdTokenVerificationError,
  verifyFirebaseIdToken,
} from "./firebaseIdTokenVerify";

export type AdminAuthSuccess = {
  uid: string;
  email: string;
};

export type AdminAuthFailure = {
  error: string;
  status: 401 | 403 | 500;
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

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    console.log(`${logPrefix} decoded email`, decoded.email);

    if (!isAdminEmailAllowed(decoded.email)) {
      console.warn(`${logPrefix} allowlist denied`, decoded.email);
      return { error: "You do not have admin access.", status: 403 };
    }

    console.log(`${logPrefix} allowlist passed`);
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch (error) {
    const message =
      error instanceof FirebaseIdTokenVerificationError
        ? error.message
        : error instanceof Error && error.message
          ? error.message
          : "Invalid or expired authorization token.";
    console.warn(`${logPrefix} token verification failed`, message);
    return { error: "Invalid or expired authorization token.", status: 401 };
  }
}

export function isAdminAuthFailure(result: AdminAuthResult): result is AdminAuthFailure {
  return "error" in result;
}
