import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./web/src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: [
      "shared/src/**/*.test.ts",
      "server/tests/**/*.test.ts",
      "supabase/seed/**/*.test.ts",
      "web/src/**/*.test.{ts,tsx}",
    ],
  },
});
