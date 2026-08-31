import { Router } from "express";
import { resolve } from "node:path";

import { createApp } from "../../../server/src/app.js";
import { parseBaseServerConfig } from "../../../server/src/config/env.js";
import { createDatabaseClient } from "../../../server/src/db/client.js";
import { createDeterministicFixtureRunner } from "../../../server/src/domain/usage/fixtures.js";
import { PostgresUsageRepository } from "../../../server/src/domain/usage/repository.js";
import { activateGo, generateAnswer, readUsageSummary } from "../../../server/src/domain/usage/service.js";
import type { VerifyToken } from "../../../server/src/middleware/auth.js";
import { createUsageRouter } from "../../../server/src/routes/usage.js";
import { task0004Identity } from "./task0004-fixture.js";

const port = Number(process.env.TASK0004_PORT ?? 3104);
const base = parseBaseServerConfig({
  ...process.env,
  APP_URL: `http://127.0.0.1:${port}`,
  PORT: String(port),
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? "task0004-support-secret-not-used",
  DEMO_SESSION_SIGNING_SECRET: process.env.DEMO_SESSION_SIGNING_SECRET
    ?? "task0004-support-signing-secret-not-used-0000",
});
const config = { ...base, port, appUrl: `http://127.0.0.1:${port}` };
const sql = createDatabaseClient(config.databaseUrl);
const repository = new PostgresUsageRepository(sql);
const clock = () => new Date();
const successRunner = createDeterministicFixtureRunner(3_000);
const failureRunner = createDeterministicFixtureRunner(3_000, async () => {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000));
  throw new Error("fixture_failed");
});

const verifyToken: VerifyToken = async (token) => {
  const entry = Object.values(task0004Identity).find((candidate) => candidate.token === token);
  return entry ? { userId: entry.userId, email: "fixture@example.test" } : null;
};

const apiRouter = Router();
apiRouter.use(createUsageRouter({
  verifyToken,
  activate: (identity) => activateGo(identity.userId, { repository, clock }),
  readSummary: (identity) => readUsageSummary(identity.userId, { repository, clock }),
  generateAnswer: (identity, input) => generateAnswer(identity.userId, input, {
    repository,
    clock,
    runFixture: identity.userId === task0004Identity.failure.userId ? failureRunner : successRunner,
  }),
}));

const app = createApp({
  config,
  webDistPath: resolve(process.cwd(), "dist/web"),
  apiRouter,
});
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`TASK-0004 support server listening on ${port}`);
});

const close = () => {
  server.close(() => { void sql.end().finally(() => process.exit(0)); });
};
process.once("SIGTERM", close);
process.once("SIGINT", close);
