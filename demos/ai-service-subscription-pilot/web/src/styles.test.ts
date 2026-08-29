import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesheetPath = fileURLToPath(new URL("./styles.css", import.meta.url));

describe("foundation stylesheet", () => {
  it("defines the approved semantic palette and typography roles", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    for (const token of [
      "--background",
      "--foreground",
      "--card",
      "--card-foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--accent",
      "--accent-foreground",
      "--muted",
      "--muted-foreground",
      "--border",
      "--ring",
      "--destructive",
      "--destructive-foreground",
    ]) {
      expect(stylesheet).toContain(`${token}:`);
    }

    expect(stylesheet).toContain('@import "@fontsource-variable/fraunces/full.css"');
    expect(stylesheet).toContain('@import "@fontsource-variable/source-sans-3/index.css"');
    expect(stylesheet).toMatch(/--font-display:\s*"Fraunces Variable",\s*Georgia/);
    expect(stylesheet).toMatch(
      /--font-interface:\s*"Source Sans 3 Variable",\s*system-ui/,
    );
  });

  it("uses pinned OFL packages that contain non-empty variable WOFF2 assets", () => {
    for (const packageName of ["fraunces", "source-sans-3"]) {
      const packageRoot = fileURLToPath(new URL(
        `../../node_modules/@fontsource-variable/${packageName}/`,
        import.meta.url,
      ));
      const manifest = JSON.parse(readFileSync(`${packageRoot}/package.json`, "utf8")) as {
        version: string;
        license: string;
      };
      expect(manifest).toMatchObject({ version: "5.3.0", license: "OFL-1.1" });
      expect(readFileSync(`${packageRoot}/LICENSE`, "utf8")).toContain("SIL OPEN FONT LICENSE");
      const assets = readdirSync(`${packageRoot}/files`).filter((name) => name.endsWith(".woff2"));
      expect(assets.length).toBeGreaterThan(0);
      expect(readFileSync(`${packageRoot}/files/${assets[0]}`).byteLength).toBeGreaterThan(10_000);
    }
  });

  it("keeps reading content strong and supplies an opaque transparency fallback", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toContain(".reading-surface");
    expect(stylesheet).toContain("--surface-reading");
    expect(stylesheet).toContain("prefers-reduced-transparency: reduce");
    expect(stylesheet).toContain("backdrop-filter: none");
    expect(stylesheet).toContain("background: var(--card)");
  });

  it("provides visible focus, 44px targets, mobile order, and reduced motion", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toContain(":focus-visible");
    expect(stylesheet).toMatch(/min-height:\s*44px/);
    expect(stylesheet).toContain("@media (max-width: 720px)");
    expect(stylesheet).toContain("prefers-reduced-motion: reduce");
    expect(stylesheet).toContain("overflow-x: hidden");
  });
});
