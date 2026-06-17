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

export function getFirebaseProjectId(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
}

export function getFirebaseTokenIssuer(projectId: string): string {
  return `https://securetoken.google.com/${projectId}`;
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

function mapJwtVerifyError(error: unknown): FirebaseIdTokenVerificationError {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? error.code : null;

    if (code === "ERR_JWT_EXPIRED") {
      return new FirebaseIdTokenVerificationError("Token verification failed: token expired.");
    }

    if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      const claim =
        "claim" in error && typeof error.claim === "string" ? error.claim : null;
      if (claim === "iss" || claim === "issuer" || claim === "aud" || claim === "audience") {
        return new FirebaseIdTokenVerificationError("Invalid issuer/audience.");
      }
      return new FirebaseIdTokenVerificationError("Invalid issuer/audience.");
    }

    if (
      code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" ||
      code === "ERR_JWS_INVALID" ||
      code === "ERR_JWT_INVALID"
    ) {
      return new FirebaseIdTokenVerificationError("Token verification failed.");
    }

    if (error.message) {
      return new FirebaseIdTokenVerificationError(error.message);
    }
  }

  return new FirebaseIdTokenVerificationError("Token verification failed.");
}

/** Verifies a Firebase client ID token using Google's public JWKS (no firebase-admin/auth). */
export async function verifyFirebaseIdToken(
  idToken: string,
  options?: { logPrefix?: string },
): Promise<VerifiedFirebaseIdToken> {
  const logPrefix = options?.logPrefix ?? "[firebase-id-token]";
  const projectId = getFirebaseProjectId();

  if (!projectId) {
    console.error(`${logPrefix} missing NEXT_PUBLIC_FIREBASE_PROJECT_ID`);
    throw new FirebaseIdTokenVerificationError("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  }

  const expectedIssuer = getFirebaseTokenIssuer(projectId);
  const expectedAudience = projectId;
  console.log(`${logPrefix} projectId used for audience/issuer`, projectId);
  console.log(`${logPrefix} expected issuer`, expectedIssuer);
  console.log(`${logPrefix} expected audience`, expectedAudience);

  try {
    const { payload } = await jwtVerify(idToken, getFirebaseJwks(), {
      issuer: expectedIssuer,
      audience: expectedAudience,
    });

    const uid = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email.trim() : null;
    const emailVerified = payload.email_verified === true;

    console.log(`${logPrefix} decoded token uid`, uid ?? "(none)");
    console.log(`${logPrefix} decoded token email`, email ?? "(none)");
    console.log(`${logPrefix} decoded token email_verified`, payload.email_verified ?? "(none)");

    if (!uid) {
      throw new FirebaseIdTokenVerificationError("Token verification failed: missing uid.");
    }

    if (!email) {
      throw new FirebaseIdTokenVerificationError("Missing email in token.");
    }

    return {
      uid,
      email,
      emailVerified,
    };
  } catch (error) {
    if (error instanceof FirebaseIdTokenVerificationError) {
      console.warn(`${logPrefix} verification failed`, error.message);
      throw error;
    }

    const mapped = mapJwtVerifyError(error);
    console.warn(`${logPrefix} verification failed`, mapped.message);
    throw mapped;
  }
}
