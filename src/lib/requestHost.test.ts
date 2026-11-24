import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRequestHost,
  getRequestOrigin,
  getRequestProtocol,
  getRequestUrl,
} from "./requestHost.ts";

describe("getRequestHost", () => {
  it("prefers x-forwarded-host over Host", () => {
    const headers = new Headers({
      host: "backend-abc-uc.a.run.app",
      "x-forwarded-host": "xmbroider.com",
    });
    assert.equal(getRequestHost(headers), "xmbroider.com");
  });

  it("uses the first x-forwarded-host value when comma-separated", () => {
    const headers = new Headers({
      host: "backend-abc-uc.a.run.app",
      "x-forwarded-host": "xmbroider.com, www.xmbroider.com",
    });
    assert.equal(getRequestHost(headers), "xmbroider.com");
  });

  it("falls back to Host when x-forwarded-host is absent", () => {
    const headers = new Headers({ host: "localhost:3000" });
    assert.equal(getRequestHost(headers), "localhost:3000");
  });
});

describe("getRequestOrigin / getRequestUrl", () => {
  it("builds origin from forwarded proto and host", () => {
    const headers = new Headers({
      host: "backend-abc-uc.a.run.app",
      "x-forwarded-host": "xmbroider.com",
      "x-forwarded-proto": "https",
    });
    assert.equal(getRequestProtocol(headers), "https");
    assert.equal(getRequestOrigin(headers), "https://xmbroider.com");
  });

  it("rewrites request.url origin without changing search params", () => {
    const request = new Request(
      "https://backend-abc-uc.a.run.app/api/preview-image-data?url=https://example.com/a.png",
      {
        headers: {
          host: "backend-abc-uc.a.run.app",
          "x-forwarded-host": "xmbroider.com",
          "x-forwarded-proto": "https",
        },
      },
    );
    const url = getRequestUrl(request);
    assert.equal(url.origin, "https://xmbroider.com");
    assert.equal(url.pathname, "/api/preview-image-data");
    assert.equal(url.searchParams.get("url"), "https://example.com/a.png");
  });
});
