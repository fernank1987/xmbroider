import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseQuoteNotificationEmails } from "./sendQuoteNotification.ts";

describe("parseQuoteNotificationEmails", () => {
  it("returns a one-element list for a single address", () => {
    assert.deepEqual(parseQuoteNotificationEmails("you@example.com"), [
      "you@example.com",
    ]);
  });

  it("splits comma-separated addresses, trims, and drops empties", () => {
    assert.deepEqual(
      parseQuoteNotificationEmails(" a@example.com , ,b@example.com,  "),
      ["a@example.com", "b@example.com"],
    );
  });

  it("returns an empty list when unset, blank, or only commas", () => {
    assert.deepEqual(parseQuoteNotificationEmails(undefined), []);
    assert.deepEqual(parseQuoteNotificationEmails(null), []);
    assert.deepEqual(parseQuoteNotificationEmails("  "), []);
    assert.deepEqual(parseQuoteNotificationEmails(", ,"), []);
  });
});
