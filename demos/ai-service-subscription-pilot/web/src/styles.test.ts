import { readFileSync } from "node:fs";
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

    expect(stylesheet).toMatch(/--font-display:\s*"Fraunces",\s*Georgia/);
    expect(stylesheet).toMatch(
      /--font-interface:\s*"Source Sans 3",\s*system-ui/,
    );
  });

  it("keeps reading content strong and supplies an opaque transparency fallback", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toContain(".reading-surface");
    expect(stylesheet).toContain("--surface-reading");
    expect(stylesheet).toContain("prefers-reduced-transparency: reduce");
    expect(stylesheet).toContain("backdrop-filter: none");
    expect(stylesheet).toContain("background: var(--card)");
  });
});
