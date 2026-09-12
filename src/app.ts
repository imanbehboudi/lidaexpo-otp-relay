import { Hono } from "hono";

import { forwardToIppanel } from "./ippanel.js";

export type AppDependencies = {
  fetcher?: typeof fetch;
};

export function createApp({ fetcher = fetch }: AppDependencies = {}) {
  const app = new Hono();

  app.get("/health", (context) => context.json({ data: { service: "lidaexpo-otp-relay", status: "ok" } }));

  app.post("/v1/api/send", async (context) => {
    const rawBody = await context.req.text();
    try {
      // Returning the upstream Response preserves its status, headers, and body.
      return await forwardToIppanel(rawBody, context.req.raw.headers, fetcher);
    } catch {
      return context.json({ error: { code: "UPSTREAM_UNAVAILABLE" } }, 502);
    }
  });

  app.notFound((context) => context.json({ error: { code: "NOT_FOUND" } }, 404));

  return app;
}
