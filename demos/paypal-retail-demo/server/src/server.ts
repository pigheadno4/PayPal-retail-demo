import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { parseServerEnv, type RawServerEnv } from "./config/env.js";

export function startServer(env: RawServerEnv = process.env) {
  const config = parseServerEnv(env);
  const app = createApp();

  return app.listen(config.port, () => {
    console.log(`PayPal retail demo API listening on ${config.port}`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
