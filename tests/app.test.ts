import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";
import { signRelayRequest } from "../src/signature.js";

const fixedNow = 1_800_000_000_000;
const config = {
  PORT: 3000,
  IPPANEL_AUTHORIZATION: "ippanel-token-for-test-only",
  IPPANEL_FROM_NUMBER: "+983001234",
  IPPANEL_PATTERN_CODE: "pattern-code-for-test-only",
  OTP_RELAY_SIGNING_SECRET: "a-test-signing-secret-with-more-than-thirty-two-characters",
};

function signedRequest(body: string, timestamp = String(fixedNow)) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lida-timestamp": timestamp,
      "x-lida-signature": signRelayRequest(config.OTP_RELAY_SIGNING_SECRET, timestamp, body),
    },
    body,
  };
}

test("accepts a signed Worker request and calls IPPanel with the Pattern payload", async () => {
    let upstreamInput: RequestInfo | URL | undefined;
    let upstreamInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (input, init) => {
      upstreamInput = input;
      upstreamInit = init;
      return new Response(null, { status: 200 });
    };
    const app = createApp({ config, fetcher, now: () => fixedNow });
    const body = JSON.stringify({ recipient: "+989121234567", otp: "654321" });

    const response = await app.request("http://relay.test/v1/otp/send", signedRequest(body));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: { accepted: true } });
    assert.equal(upstreamInput, "https://edge.ippanel.com/v1/api/send");
    assert.deepEqual(upstreamInit, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: config.IPPANEL_AUTHORIZATION },
      body: JSON.stringify({
        sending_type: "pattern",
        from_number: config.IPPANEL_FROM_NUMBER,
        code: config.IPPANEL_PATTERN_CODE,
        recipients: ["+989121234567"],
        params: { OTP: "654321" },
      }),
      signal: upstreamInit?.signal,
    });
});

test("rejects an unsigned request before it can reach IPPanel", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    };
    const app = createApp({ config, fetcher, now: () => fixedNow });
    const body = JSON.stringify({ recipient: "+989121234567", otp: "654321" });

    const response = await app.request("http://relay.test/v1/otp/send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-lida-timestamp": String(fixedNow) },
      body,
    });

    assert.equal(response.status, 401);
    assert.equal(calls, 0);
});

test("rejects expired signatures before it can reach IPPanel", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    };
    const app = createApp({ config, fetcher, now: () => fixedNow });
    const body = JSON.stringify({ recipient: "+989121234567", otp: "654321" });
    const staleTimestamp = String(fixedNow - 60_001);

    const response = await app.request("http://relay.test/v1/otp/send", signedRequest(body, staleTimestamp));

    assert.equal(response.status, 401);
    assert.equal(calls, 0);
});

test("does not permit arbitrary payloads to be proxied", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    };
    const app = createApp({ config, fetcher, now: () => fixedNow });
    const body = JSON.stringify({ recipient: "+989121234567", otp: "654321", url: "https://example.com" });

    const response = await app.request("http://relay.test/v1/otp/send", signedRequest(body));

    assert.equal(response.status, 422);
    assert.equal(calls, 0);
});
