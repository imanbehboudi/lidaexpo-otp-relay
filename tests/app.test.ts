import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../src/app.js";
function ippanelRequest(body: string) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "IPPanel authorization from Lida",
      accept: "application/json",
    },
    body,
  };
}

test("forwards Lida's raw IPPanel request without reading or rebuilding its body", async () => {
    let upstreamInput: RequestInfo | URL | undefined;
    let upstreamInit: RequestInit | undefined;
    const fetcher: typeof fetch = async (input, init) => {
      upstreamInput = input;
      upstreamInit = init;
      return new Response(null, { status: 200 });
    };
    const app = createApp({ fetcher });
    const body = JSON.stringify({
      sending_type: "pattern",
      from_number: "+983000505",
      code: "qyyb4wxn7dillwa",
      recipients: ["+989121234567"],
      params: { OTP: "654321" },
    });

    const response = await app.request("http://relay.test/v1/api/send", ippanelRequest(body));

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "");
    assert.equal(upstreamInput, "https://edge.ippanel.com/v1/api/send");
    assert.equal(upstreamInit?.method, "POST");
    assert.equal(upstreamInit?.body, body);
    assert.ok(upstreamInit?.signal);
    const forwardedHeaders = new Headers(upstreamInit?.headers);
    assert.equal(forwardedHeaders.get("content-type"), "application/json");
    assert.equal(forwardedHeaders.get("authorization"), "IPPanel authorization from Lida");
    assert.equal(forwardedHeaders.get("accept"), "application/json");
});

test("returns IPPanel's response status, headers, and body unchanged", async () => {
    const fetcher: typeof fetch = async () => new Response('{"meta":{"error":true}}', {
      status: 422,
      headers: { "content-type": "application/json", "x-ippanel-request-id": "provider-id" },
    });
    const app = createApp({ fetcher });
    const body = '{"sending_type":"pattern"}';

    const response = await app.request("http://relay.test/v1/api/send", ippanelRequest(body));

    assert.equal(response.status, 422);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.equal(response.headers.get("x-ippanel-request-id"), "provider-id");
    assert.equal(await response.text(), '{"meta":{"error":true}}');
});

test("does not expose a generic forwarding endpoint", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    };
    const app = createApp({ fetcher });
    const body = JSON.stringify({ recipient: "+989121234567", otp: "654321" });

    const response = await app.request("http://relay.test/other-service/send", ippanelRequest(body));

    assert.equal(response.status, 404);
    assert.equal(calls, 0);
});

test("returns a controlled error only when IPPanel cannot be reached", async () => {
  const fetcher: typeof fetch = async () => { throw new Error("network unavailable"); };
  const app = createApp({ fetcher });

  const response = await app.request("http://relay.test/v1/api/send", ippanelRequest('{"sending_type":"pattern"}'));

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: { code: "UPSTREAM_UNAVAILABLE" } });
});
