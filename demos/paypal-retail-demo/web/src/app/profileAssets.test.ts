import { describe, expect, it } from "vitest";

import { resolveProfileAssets } from "./profileAssets.js";

describe("profile asset resolver", () => {
  it("keeps POP MART assets and visual theme separate from generic assets", () => {
    const popmart = resolveProfileAssets({
      slug: "popmart",
      displayName: "POP MART",
      brandMode: "popmart",
    });
    const generic = resolveProfileAssets({
      slug: "generic",
      displayName: "MochiToy Studio",
      brandMode: "generic",
    });

    expect(popmart).toEqual({
      assetBasePath: "/assets/popmart",
      logoText: "POP MART",
      themeClassName: "theme-popmart",
      resolveAssetPath: expect.any(Function),
    });
    expect(popmart.resolveAssetPath("products/labubu.webp")).toBe(
      "/assets/popmart/products/labubu.webp",
    );
    expect(generic.assetBasePath).toBe("/assets/generic");
    expect(generic.logoText).toBe("MochiToy Studio");
    expect(generic.themeClassName).toBe("theme-generic");
    expect(generic.resolveAssetPath("/categories/plush.webp")).toBe(
      "/assets/generic/categories/plush.webp",
    );
  });
});
