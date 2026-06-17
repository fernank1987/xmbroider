import {
  isAdminEmailAllowlistConfigured,
  isAdminEmailAllowed,
} from "@/app/admin/lib/adminAllowlist";
import {
  FirebaseIdTokenVerificationError,
  getFirebaseProjectId,
  getFirebaseTokenIssuer,
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

type BearerTokenResult =
  | { token: string; error: null }
  | { token: null; error: "missing_authorization_header" | "invalid_bearer_token" };

function readBearerToken(request: Request): BearerTokenResult {
  const authHeader = request.headers.get("Authorization");
  const hasAuthorizationHeader = Boolean(authHeader);
  console.log(`${LOG_PREFIX} has Authorization header`, hasAuthorizationHeader);

  if (!authHeader) {
    console.warn(`${LOG_PREFIX} has bearer token`, false);
    return { token: null, error: "missing_authorization_header" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.warn(`${LOG_PREFIX} has bearer token`, false);
    return { token: null, error: "invalid_bearer_token" };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const hasBearerToken = Boolean(token);
  console.log(`${LOG_PREFIX} has bearer token`, hasBearerToken);

  if (!hasBearerToken) {
    return { token: null, error: "invalid_bearer_token" };
  }

  return { token, error: null };
}

/** Verifies Firebase ID token and admin email allowlist for server routes. */
export async function verifyAdminRequest(
  request: Request,
  options?: { logPrefix?: string },
): Promise<AdminAuthResult> {
  const logPrefix = options?.logPrefix ?? LOG_PREFIX;
  const bearer = readBearerToken(request);

  if (bearer.error !== null) {
    if (bearer.error === "missing_authorization_header") {
      return { error: "Missing Authorization header.", status: 401 };
    }
    return { error: "Invalid Bearer token.", status: 401 };
  }

  const idToken = bearer.token;

  const projectId = getFirebaseProjectId();
  console.log(`${logPrefix} allowlist configured`, isAdminEmailAllowlistConfigured());
  if (projectId) {
    console.log(`${logPrefix} expected issuer`, getFirebaseTokenIssuer(projectId));
    console.log(`${logPrefix} expected audience`, projectId);
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken, { logPrefix });

    if (!decoded.emailVerified) {
      console.warn(`${logPrefix} email_verified is false`, decoded.email);
    }

    const emailAllowed = isAdminEmailAllowed(decoded.email);
    console.log(`${logPrefix} email matched allowlist`, emailAllowed);

    if (!emailAllowed) {
      console.warn(`${logPrefix} allowlist denied`, decoded.email);
      return { error: "Email not on admin allowlist.", status: 403 };
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
          : "Token verification failed.";

    console.warn(`${logPrefix} token verification failed`, message);
    return { error: message, status: 401 };
  }
}

export function isAdminAuthFailure(result: AdminAuthResult): result is AdminAuthFailure {
  return "error" in result;
}
