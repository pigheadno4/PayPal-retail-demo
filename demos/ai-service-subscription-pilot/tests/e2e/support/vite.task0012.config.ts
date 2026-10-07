import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({ root: resolve("web"), envDir: false, plugins: [react()],
  build: { outDir: resolve("dist/web"), emptyOutDir: true, rolldownOptions: { preserveEntrySignatures: "strict",
    input: { main: resolve("web/index.html"), "task0012-runtime": resolve("tests/e2e/support/task0011-browser-entry.ts") },
    output: { entryFileNames: chunk => chunk.name === "task0012-runtime" ? "assets/task0012-runtime.js" : "assets/[name]-[hash].js" } } },
  define: { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://127.0.0.1:3112"), "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("synthetic-public"), "import.meta.env.VITE_PAYPAL_CLIENT_ID": JSON.stringify("synthetic-client") },
});
