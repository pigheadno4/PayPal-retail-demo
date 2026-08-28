import { resolve } from "node:path";

import { createApp } from "./app.js";
import { parseBaseServerConfig } from "./config/env.js";

const config = parseBaseServerConfig(process.env);
const app = createApp({
  config,
  webDistPath: resolve(process.cwd(), "dist/web"),
});

app.listen(config.port, () => {
  console.log(`AI service demo server listening on port ${config.port}`);
});
