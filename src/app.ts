import { randomUUID } from "node:crypto";

import { Hono } from "hono";
import { z } from "zod";

import type { RelayConfig } from "./config.js";
import { sendIppanelPattern } from "./ippanel.js";
import { isValidRelaySignature } from "./signature.js";

const maxBodyBytes = 1_024;
const maxClockSkewMs = 60_000;

const otpPayloadSchema = z.object({
  recipient: z.string().regex(/^\+989\d{9}$/, "recipient must be an Iranian E.164 mobile number"),
  otp: z.string().regex(/^\d{6}$/, "otp must contain six ASCII digits"),
}).strict();

type AppVariables = { requestId: string };

export type AppDependencies = {
  config: RelayConfig;
  fetcher?: typeof fetch;
  now?: () => number;
};

function jsonError(code: string) {
  return { error: { code } };
}

export function createApp({ config, fetcher = fetch, now = Date.now }: AppDependencies) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("*", async (context, next) => {
    const requestId = randomUUID();
    context.set("requestId", requestId);
    context.header("X-Request-Id", requestId);
    context.header("Cache-Control", "no-store");
    context.header("X-Content-Type-Options", "nosniff");
    context.header("Referrer-Policy", "no-referrer");
    await next();
  });

  app.get("/health", (context) => context.json({ data: { service: "lidaexpo-otp-relay", status: "ok" } }));

  app.post("/v1/otp/send", async (context) => {
    const contentLength = Number(context.req.header("content-length") ?? 0);
    if (!Number.isFinite(contentLength) || contentLength > maxBodyBytes) {
      return context.json(jsonError("PAYLOAD_TOO_LARGE"), 413);
    }

    if (!context.req.header("content-type")?.toLowerCase().includes("application/json")) {
      return context.json(jsonError("UNSUPPORTED_MEDIA_TYPE"), 415);
    }

    const timestamp = context.req.header("x-lida-timestamp");
    const signature = context.req.header("x-lida-signature");
    if (!timestamp || !signature) return context.json(jsonError("UNAUTHORIZED"), 401);

    const timestampMs = Number(timestamp);
    if (!Number.isSafeInteger(timestampMs) || Math.abs(now() - timestampMs) > maxClockSkewMs) {
      return context.json(jsonError("UNAUTHORIZED"), 401);
    }

    const rawBody = await context.req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return context.json(jsonError("PAYLOAD_TOO_LARGE"), 413);
    }

    if (!isValidRelaySignature(config.OTP_RELAY_SIGNING_SECRET, timestamp, rawBody, signature)) {
      return context.json(jsonError("UNAUTHORIZED"), 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return context.json(jsonError("INVALID_REQUEST"), 422);
    }

    const parsed = otpPayloadSchema.safeParse(payload);
    if (!parsed.success) return context.json(jsonError("INVALID_REQUEST"), 422);

    const accepted = await sendIppanelPattern(config, parsed.data, fetcher);
    if (!accepted) {
      console.error("IPPanel rejected OTP delivery", { requestId: context.get("requestId") });
      return context.json(jsonError("UPSTREAM_UNAVAILABLE"), 502);
    }

    return context.json({ data: { accepted: true } });
  });

  app.notFound((context) => context.json(jsonError("NOT_FOUND"), 404));
  app.onError((error, context) => {
    console.error("Unhandled relay error", { requestId: context.get("requestId"), name: error.name });
    return context.json(jsonError("INTERNAL_ERROR"), 500);
  });

  return app;
}
