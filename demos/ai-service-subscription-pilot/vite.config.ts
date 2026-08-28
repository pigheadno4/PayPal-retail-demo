import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

export const ALLOWED_PUBLIC_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_PAYPAL_CLIENT_ID",
] as const;

export function assertAllowedPublicEnv(
  environment: Record<string, string>,
): void {
  const allowed = new Set<string>(ALLOWED_PUBLIC_ENV_KEYS);
  const unexpected = Object.keys(environment).find(
    (key) => key.startsWith("VITE_") && !allowed.has(key),
  );

  if (unexpected) {
    throw new Error(`Disallowed public environment variable: ${unexpected}`);
  }
}

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, projectRoot, "");
  assertAllowedPublicEnv(environment);

  return {
    root: resolve(projectRoot, "web"),
    envDir: projectRoot,
    plugins: [react()],
    build: {
      outDir: resolve(projectRoot, "dist/web"),
      emptyOutDir: true,
    },
    server: {
      proxy: {
        "/api/v1": "http://127.0.0.1:3000",
        "/webhooks": "http://127.0.0.1:3000",
      },
    },
  };
});
