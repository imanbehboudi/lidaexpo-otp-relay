import { createHmac, timingSafeEqual } from "node:crypto";

export function signRelayRequest(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("base64url");
}

export function isValidRelaySignature(secret: string, timestamp: string, rawBody: string, received: string): boolean {
  const expected = Buffer.from(signRelayRequest(secret, timestamp, rawBody), "base64url");
  const candidate = Buffer.from(received, "base64url");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
