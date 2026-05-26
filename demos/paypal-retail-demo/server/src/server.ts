import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";

const defaultPort = Number.parseInt(process.env.PORT ?? "3000", 10);

export function startServer(port = defaultPort) {
  const app = createApp();

  return app.listen(port, () => {
    console.log(`PayPal retail demo API listening on ${port}`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
