import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const REQUIRED_FIREBASE_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type RequiredFirebaseEnvKey = (typeof REQUIRED_FIREBASE_ENV_KEYS)[number];

export type FirebaseConfigStatus = {
  isConfigured: boolean;
  keys: Record<RequiredFirebaseEnvKey, boolean>;
  missingKeys: RequiredFirebaseEnvKey[];
  /** Optional — not required for Firebase client initialization */
  hasMeasurementId: boolean;
};

export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function isEnvPresent(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/** Boolean-only diagnostics for required Firebase env keys. Never exposes values. */
export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const keys: Record<RequiredFirebaseEnvKey, boolean> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    ),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    ),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    NEXT_PUBLIC_FIREBASE_APP_ID: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    ),
  };

  const missingKeys = REQUIRED_FIREBASE_ENV_KEYS.filter((key) => !keys[key]);

  return {
    isConfigured: missingKeys.length === 0,
    keys,
    missingKeys,
    hasMeasurementId: isEnvPresent(
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    ),
  };
}

/** Reads Firebase web config from NEXT_PUBLIC_* env vars. Returns null when incomplete. */
export function getFirebasePublicConfig(): FirebasePublicConfig | null {
  const status = getFirebaseConfigStatus();
  if (!status.isConfigured) {
    return null;
  }

  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!.trim(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!.trim(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!.trim(),
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!.trim(),
    ...(measurementId ? { measurementId } : {}),
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
export const isFirebaseConfigured = getFirebaseConfigStatus().isConfigured;

/** Boolean-only Firebase env diagnostics. Never exposes secret values. */
export const firebaseConfigStatus = getFirebaseConfigStatus();

/** Initialized Firebase app, or null when env vars are missing. */
export const firebaseApp = firebaseClient.app;

/** Firebase Auth instance, or null when Firebase is disabled. */
export const auth = firebaseClient.auth;

/** Firestore instance, or null when Firebase is disabled. */
export const db = firebaseClient.db;

/** Firebase Storage instance, or null when Firebase is disabled. */
export const storage = firebaseClient.storage;

export default firebaseClient;
