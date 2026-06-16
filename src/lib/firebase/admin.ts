import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | undefined;

/** Returns Firestore Admin SDK when FIREBASE_SERVICE_ACCOUNT_JSON is configured. */
export function getAdminFirestore(): Firestore | null {
  if (getApps().length > 0) {
    return getFirestore();
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
    });

    return getFirestore(adminApp);
  } catch {
    return null;
  }
}
