import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../../..");

describe("shadcn foundation", () => {
  it("defines the agreed shared primitive component layer", () => {
    const requiredFiles = [
      "components.json",
      "web/src/lib/utils.ts",
      "web/src/components/ui/button.tsx",
      "web/src/components/ui/card.tsx",
      "web/src/components/ui/badge.tsx",
      "web/src/components/ui/separator.tsx",
      "web/src/components/ui/skeleton.tsx",
      "web/src/components/ui/sheet.tsx",
      "web/src/components/ui/dialog.tsx",
      "web/src/components/ui/tabs.tsx",
      "web/src/components/ui/accordion.tsx",
      "web/src/components/ui/collapsible.tsx",
      "web/src/components/ui/scroll-area.tsx",
      "web/src/components/ui/field.tsx",
      "web/src/components/ui/input.tsx",
      "web/src/components/ui/label.tsx",
      "web/src/components/ui/checkbox.tsx",
      "web/src/components/ui/select.tsx",
      "web/src/components/ui/textarea.tsx",
    ];

    expect(
      requiredFiles.filter((filePath) =>
        existsSync(resolve(projectRoot, filePath)),
      ),
    ).toEqual(requiredFiles);
  });

  it("keeps shadcn aliases inside the Vite web source tree", () => {
    const configPath = resolve(projectRoot, "components.json");

    expect(existsSync(configPath)).toBe(true);

    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      aliases?: Record<string, string>;
      tsx?: boolean;
    };

    expect(config.tsx).toBe(true);
    expect(config.aliases?.ui).toBe("@/components/ui");
    expect(config.aliases?.utils).toBe("@/lib/utils");
  });
});
