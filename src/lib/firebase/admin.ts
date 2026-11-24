import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type AdminStorageBucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

type ServiceAccountFields = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type AdminAppInit =
  | {
      source: "service-account-json";
      projectId: string;
      storageBucket: string | undefined;
      credential: ServiceAccountFields;
    }
  | {
      source: "application-default";
      projectId: string;
      storageBucket: string | undefined;
    }
  | { source: null };

let adminApp: App | undefined;

function readPublicProjectId(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || undefined;
}

function readPublicStorageBucket(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined;
}

function parseServiceAccountJson(raw: string): ServiceAccountFields | null {
  try {
    const serviceAccount = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      return null;
    }

    return {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

/**
 * Chooses Admin SDK credentials without initializing Firebase.
 *
 * - `FIREBASE_SERVICE_ACCOUNT_JSON` set → explicit service-account cert (Vercel / local).
 * - Otherwise, if `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is set → Application Default
 *   Credentials (App Hosting compute service account on Cloud Run).
 * - Malformed JSON does not fall through to ADC (fail closed).
 */
export function resolveAdminAppInit(): AdminAppInit {
  const projectId = readPublicProjectId();
  const storageBucket = readPublicStorageBucket();
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawJson) {
    const credential = parseServiceAccountJson(rawJson);
    if (!credential) {
      return { source: null };
    }

    return {
      source: "service-account-json",
      projectId: projectId || credential.projectId,
      storageBucket,
      credential,
    };
  }

  if (!projectId) {
    return { source: null };
  }

  return {
    source: "application-default",
    projectId,
    storageBucket,
  };
}

function initializeAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0] ?? null;
  }

  const resolved = resolveAdminAppInit();
  if (resolved.source === null) {
    return null;
  }

  try {
    if (resolved.source === "service-account-json") {
      adminApp = initializeApp({
        credential: cert({
          projectId: resolved.credential.projectId,
          clientEmail: resolved.credential.clientEmail,
          privateKey: resolved.credential.privateKey,
        }),
        projectId: resolved.projectId,
        storageBucket: resolved.storageBucket,
      });
    } else {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: resolved.projectId,
        storageBucket: resolved.storageBucket,
      });
    }

    return adminApp;
  } catch {
    return null;
  }
}

/** Returns the initialized Firebase Admin app when configured. */
export function getAdminApp(): App | null {
  return initializeAdminApp();
}

/** Returns Firestore Admin SDK when a service-account JSON or ADC is available. */
export function getAdminFirestore(): Firestore | null {
  const app = initializeAdminApp();
  if (!app) {
    return null;
  }
  return getFirestore(app);
}

/** Returns Firebase Storage bucket for server-side uploads. */
export function getAdminStorageBucket(): AdminStorageBucket | null {
  const app = initializeAdminApp();
  if (!app) {
    return null;
  }

  const bucketName = readPublicStorageBucket();
  if (!bucketName) {
    return null;
  }

  return getStorage(app).bucket(bucketName);
}

/** Alias for getAdminStorageBucket(). */
export function getAdminStorage(): AdminStorageBucket | null {
  return getAdminStorageBucket();
}
