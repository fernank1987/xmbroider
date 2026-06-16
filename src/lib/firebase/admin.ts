import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type AdminStorageBucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

let adminApp: App | undefined;

function initializeAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0] ?? null;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      return null;
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
    });

    return adminApp;
  } catch {
    return null;
  }
}

/** Returns the initialized Firebase Admin app when configured. */
export function getAdminApp(): App | null {
  return initializeAdminApp();
}

/** Returns Firestore Admin SDK when FIREBASE_SERVICE_ACCOUNT_JSON is configured. */
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

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucketName) {
    return null;
  }

  return getStorage(app).bucket(bucketName);
}
