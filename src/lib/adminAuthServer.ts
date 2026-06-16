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

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

/** Verifies Firebase ID token and admin email allowlist for server routes. */
export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  const idToken = readBearerToken(request);
  if (!idToken) {
    return { error: "Missing authorization token.", status: 401 };
  }

  const auth = getAdminAuth();
  if (!auth) {
    return { error: "Admin server is not configured.", status: 503 };
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email || !isAdminEmailAllowed(email)) {
      return { error: "You do not have admin access.", status: 403 };
    }

    return {
      uid: decoded.uid,
      email,
    };
  } catch {
    return { error: "Invalid or expired authorization token.", status: 401 };
  }
}

export function isAdminAuthFailure(result: AdminAuthResult): result is AdminAuthFailure {
  return "error" in result;
}
