import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConfigEnv, UserConfig } from "vite";
import { describe, expect, it } from "vitest";

import viteConfig, {
  ALLOWED_PUBLIC_ENV_KEYS,
  assertAllowedPublicEnv,
} from "../../vite.config";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

function resolveTestConfig(): UserConfig {
  if (typeof viteConfig !== "function") {
    throw new Error("Expected a Vite configuration function");
  }

  return viteConfig({ command: "serve", mode: "test" } as ConfigEnv);
}

describe("Vite runtime boundary", () => {
  it("allows only the three approved browser-safe environment names", () => {
    expect(ALLOWED_PUBLIC_ENV_KEYS).toEqual([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_PAYPAL_CLIENT_ID",
    ]);

    expect(() =>
      assertAllowedPublicEnv({
        VITE_SUPABASE_URL: "https://project.example.test",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public-value",
        VITE_PAYPAL_CLIENT_ID: "client-id",
      }),
    ).not.toThrow();
  });

  it("rejects a provider secret carrying the public Vite prefix", () => {
    expect(() =>
      assertAllowedPublicEnv({
        VITE_PAYPAL_CLIENT_SECRET: "must-not-reach-the-browser",
      }),
    ).toThrow(/VITE_PAYPAL_CLIENT_SECRET/);
  });

  it("uses the approved web root, production output, and exact development proxies", () => {
    const config = resolveTestConfig();

    expect(config.root).toBe(resolve(projectRoot, "web"));
    expect(config.build?.outDir).toBe(resolve(projectRoot, "dist/web"));
    expect(Object.keys(config.server?.proxy ?? {})).toEqual([
      "/api/v1",
      "/webhooks",
    ]);
    expect(config.server?.proxy).not.toHaveProperty("/api");
  });
});
