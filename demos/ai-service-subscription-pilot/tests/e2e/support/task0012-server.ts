import { createServer } from "node:http";
import { resolve } from "node:path";
import { createApp } from "../../../server/src/app.js";
// Static browser fixture only: no database, provider gateway or authentication client is constructed.
const app = createApp({ config: { appUrl: "http://127.0.0.1:3112", port: 3112, databaseUrl: "postgresql://unused@127.0.0.1:1/unused", supabaseUrl: "http://127.0.0.1:3112", supabasePublishableKey: "synthetic-public", supabaseSecretKey: "synthetic-unused", demoSessionSigningSecret: "synthetic-unused-at-least-32-characters" }, webDistPath: resolve("dist/web") });
const server = createServer(app);
// Browser proxy cannot tunnel or forward any external request.
server.on("connect", (_request, socket) => socket.destroy());
server.listen(3112, "127.0.0.1");
process.once("SIGTERM", () => server.close());
