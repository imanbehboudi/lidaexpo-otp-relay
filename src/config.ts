export type RelayConfig = { PORT: number };

export function loadConfig(environment: NodeJS.ProcessEnv): RelayConfig {
  const port = Number(environment.PORT ?? 3000);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Invalid runtime configuration: PORT");
  }
  return { PORT: port };
}
