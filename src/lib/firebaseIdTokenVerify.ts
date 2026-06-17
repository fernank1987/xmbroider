import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
);

let firebaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getFirebaseJwks() {
  if (!firebaseJwks) {
    firebaseJwks = createRemoteJWKSet(FIREBASE_JWKS_URL);
  }
  return firebaseJwks;
}

function getFirebaseProjectId(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
}

export type VerifiedFirebaseIdToken = {
  uid: string;
  email: string;
  emailVerified: boolean;
};

export class FirebaseIdTokenVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseIdTokenVerificationError";
  }
}

/** Verifies a Firebase client ID token using Google's public JWKS (no firebase-admin/auth). */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedFirebaseIdToken> {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new FirebaseIdTokenVerificationError("Firebase project id is not configured.");
  }

  try {
    const { payload } = await jwtVerify(idToken, getFirebaseJwks(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    const uid = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email.trim() : null;
    const emailVerified = payload.email_verified === true;

    if (!uid || !email) {
      throw new FirebaseIdTokenVerificationError("Token is missing required user claims.");
    }

    if (payload.email_verified !== undefined && !emailVerified) {
      throw new FirebaseIdTokenVerificationError("Email address is not verified.");
    }

    return {
      uid,
      email,
      emailVerified,
    };
  } catch (error) {
    if (error instanceof FirebaseIdTokenVerificationError) {
      throw error;
    }

    throw new FirebaseIdTokenVerificationError("Invalid or expired authorization token.");
  }
}
