import "server-only";

import postgres from "postgres";

import { parseRuntimeEnv } from "@/server/config/env";

const runtimeEnv = parseRuntimeEnv(process.env);

export const sql = postgres(runtimeEnv.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});
