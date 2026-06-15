import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Reads Firebase web config from NEXT_PUBLIC_* env vars. Returns null when incomplete. */
export function getFirebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = readEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  const authDomain = readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  const projectId = readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const storageBucket = readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const appId = readEnv("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

export type FirebaseClientState = {
  isConfigured: boolean;
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
};

function createFirebaseClientState(): FirebaseClientState {
  const config = getFirebasePublicConfig();

  if (!config) {
    return {
      isConfigured: false,
      app: null,
      auth: null,
      db: null,
      storage: null,
    };
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);

  return {
    isConfigured: true,
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}

const firebaseClient = createFirebaseClientState();

/** True when all required NEXT_PUBLIC_FIREBASE_* env vars are present. */
export const isFirebaseConfigured = firebaseClient.isConfigured;

/** Initialized Firebase app, or null when env vars are missing. */
export const firebaseApp = firebaseClient.app;

/** Firebase Auth instance, or null when Firebase is disabled. */
export const auth = firebaseClient.auth;

/** Firestore instance, or null when Firebase is disabled. */
export const db = firebaseClient.db;

/** Firebase Storage instance, or null when Firebase is disabled. */
export const storage = firebaseClient.storage;

export default firebaseClient;
