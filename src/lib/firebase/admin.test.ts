import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { resolveAdminAppInit } from "./admin.ts";

const ORIGINAL_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const ORIGINAL_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const ORIGINAL_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

const VALID_JSON = JSON.stringify({
  type: "service_account",
  project_id: "json-project",
  client_email: "sa@json-project.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nMIIEtest\\n-----END PRIVATE KEY-----\\n",
});

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  setEnv("FIREBASE_SERVICE_ACCOUNT_JSON", ORIGINAL_JSON);
  setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", ORIGINAL_PROJECT_ID);
  setEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", ORIGINAL_BUCKET);
});

describe("resolveAdminAppInit", () => {
  it("uses the service-account JSON when it is set (Vercel)", () => {
    setEnv("FIREBASE_SERVICE_ACCOUNT_JSON", VALID_JSON);
    setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "xmbroider-production");
    setEnv(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "xmbroider-production.firebasestorage.app",
    );

    const resolved = resolveAdminAppInit();
    assert.equal(resolved.source, "service-account-json");
    if (resolved.source !== "service-account-json") {
      return;
    }
    assert.equal(resolved.projectId, "xmbroider-production");
    assert.equal(
      resolved.storageBucket,
      "xmbroider-production.firebasestorage.app",
    );
    assert.equal(resolved.credential.clientEmail, "sa@json-project.iam.gserviceaccount.com");
    assert.match(resolved.credential.privateKey, /BEGIN PRIVATE KEY/);
  });

  it("uses Application Default Credentials when JSON is unset and projectId is set", () => {
    setEnv("FIREBASE_SERVICE_ACCOUNT_JSON", undefined);
    setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "xmbroider-production");
    setEnv(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "xmbroider-production.firebasestorage.app",
    );

    const resolved = resolveAdminAppInit();
    assert.deepEqual(resolved, {
      source: "application-default",
      projectId: "xmbroider-production",
      storageBucket: "xmbroider-production.firebasestorage.app",
    });
  });

  it("returns null when JSON is unset and projectId is missing", () => {
    setEnv("FIREBASE_SERVICE_ACCOUNT_JSON", undefined);
    setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", undefined);
    setEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", undefined);

    assert.deepEqual(resolveAdminAppInit(), { source: null });
  });

  it("does not fall through to ADC when JSON is present but invalid", () => {
    setEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "{not-json");
    setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "xmbroider-production");
    setEnv(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "xmbroider-production.firebasestorage.app",
    );

    assert.deepEqual(resolveAdminAppInit(), { source: null });
  });

  it("does not fall through to ADC when JSON is missing required fields", () => {
    setEnv(
      "FIREBASE_SERVICE_ACCOUNT_JSON",
      JSON.stringify({ project_id: "xmbroider-production" }),
    );
    setEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "xmbroider-production");

    assert.deepEqual(resolveAdminAppInit(), { source: null });
  });
});
