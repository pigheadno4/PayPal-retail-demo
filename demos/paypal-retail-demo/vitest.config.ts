import { defineConfig } from "vitest/config";

export default defineConfig({
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
