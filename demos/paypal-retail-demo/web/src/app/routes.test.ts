import { describe, expect, it } from "vitest";

import { resolveAppRoute } from "./routes.js";

describe("app route resolver", () => {
  it("maps buyer, checkout, account, product, and admin paths", () => {
    expect(resolveAppRoute("/")).toEqual({ scope: "buyer", page: "home" });
    expect(resolveAppRoute("/checkout")).toEqual({
      scope: "buyer",
      page: "checkout",
    });
    expect(resolveAppRoute("/checkout/express-review")).toEqual({
      scope: "buyer",
      page: "express_review",
    });
    expect(resolveAppRoute("/cart")).toEqual({
      scope: "buyer",
      page: "cart",
    });
    expect(resolveAppRoute("/account/orders")).toEqual({
      scope: "buyer",
      page: "account",
      section: "orders",
    });
    expect(resolveAppRoute("/products/labubu-macaron")).toEqual({
      scope: "buyer",
      page: "product",
      productSlug: "labubu-macaron",
    });
    expect(resolveAppRoute("/admin")).toEqual({
      scope: "admin",
      page: "admin",
    });
  });

  it("does not expose admin as a buyer navigation route", () => {
    expect(resolveAppRoute("/admin/orders")).toEqual({
      scope: "admin",
      page: "admin",
    });
    expect(resolveAppRoute("/missing")).toEqual({
      scope: "buyer",
      page: "not_found",
    });
  });
});
