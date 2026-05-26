import { describe, expect, it } from "vitest";

import { workspaceInfo } from "./workspace.js";

describe("workspaceInfo", () => {
  it("describes the scaffolded demo workspace", () => {
    expect(workspaceInfo).toEqual({
      name: "paypal-retail-demo",
      profileCount: 2,
      usesTypeScript: true,
    });
  });
});
