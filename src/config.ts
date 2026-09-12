import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  IPPANEL_AUTHORIZATION: z.string().min(1),
  IPPANEL_FROM_NUMBER: z.string().regex(/^\+98\d+$/, "must use E.164 format"),
  IPPANEL_PATTERN_CODE: z.string().min(1),
  OTP_RELAY_SIGNING_SECRET: z.string().min(32),
});

export type RelayConfig = z.infer<typeof configSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv): RelayConfig {
  const parsed = configSchema.safeParse(environment);
  if (parsed.success) return parsed.data;

  const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid runtime configuration: ${fields}`);
}
