import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isAdminEmailAllowed,
  isAdminEmailAllowlistConfigured,
} from "./adminAllowlist.ts";

const ORIGINAL_ALLOWLIST = process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST;
const ORIGINAL_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS;

function setAllowlist(value: string | undefined) {
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST;
  } else {
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST = value;
  }
}

function setLegacyEmails(value: string | undefined) {
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  } else {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = value;
  }
}

afterEach(() => {
  if (ORIGINAL_ALLOWLIST === undefined) {
    delete process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST;
  } else {
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST = ORIGINAL_ALLOWLIST;
  }
  if (ORIGINAL_EMAILS === undefined) {
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  } else {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = ORIGINAL_EMAILS;
  }
});

describe("isAdminEmailAllowlistConfigured", () => {
  it("is false when both env names are unset", () => {
    setAllowlist(undefined);
    setLegacyEmails(undefined);
    assert.equal(isAdminEmailAllowlistConfigured(), false);
  });

  it("is false when values are empty or whitespace", () => {
    setAllowlist("  ");
    setLegacyEmails("");
    assert.equal(isAdminEmailAllowlistConfigured(), false);
  });

  it("is true when the canonical allowlist has an email", () => {
    setAllowlist("admin@example.com");
    setLegacyEmails(undefined);
    assert.equal(isAdminEmailAllowlistConfigured(), true);
  });
});

describe("isAdminEmailAllowed (fail closed)", () => {
  it("denies everyone when the allowlist is unset", () => {
    setAllowlist(undefined);
    setLegacyEmails(undefined);
    assert.equal(isAdminEmailAllowed("anyone@example.com"), false);
  });

  it("denies a missing email even when the allowlist is set", () => {
    setAllowlist("admin@example.com");
    assert.equal(isAdminEmailAllowed(null), false);
    assert.equal(isAdminEmailAllowed(""), false);
  });

  it("allows a listed email (case-insensitive, trimmed)", () => {
    setAllowlist(" Admin@Example.com , other@example.com ");
    assert.equal(isAdminEmailAllowed("admin@example.com"), true);
    assert.equal(isAdminEmailAllowed("  OTHER@example.com  "), true);
  });

  it("denies an email that is not listed", () => {
    setAllowlist("admin@example.com");
    assert.equal(isAdminEmailAllowed("other@example.com"), false);
  });

  it("falls back to NEXT_PUBLIC_ADMIN_EMAILS when the canonical name is unset", () => {
    setAllowlist(undefined);
    setLegacyEmails("legacy@example.com");
    assert.equal(isAdminEmailAllowlistConfigured(), true);
    assert.equal(isAdminEmailAllowed("legacy@example.com"), true);
    assert.equal(isAdminEmailAllowed("other@example.com"), false);
  });

  it("prefers NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST when both are set", () => {
    setAllowlist("canonical@example.com");
    setLegacyEmails("legacy@example.com");
    assert.equal(isAdminEmailAllowed("canonical@example.com"), true);
    assert.equal(isAdminEmailAllowed("legacy@example.com"), false);
  });
});
