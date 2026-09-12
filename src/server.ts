import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig(process.env);
const app = createApp({ config });

serve({ fetch: app.fetch, port: config.PORT, hostname: "0.0.0.0" }, () => {
  console.info(`lidaexpo-otp-relay listening on port ${config.PORT}`);
});
