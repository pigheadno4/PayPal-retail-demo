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
    expect(resolveAppRoute("/account/orders/DO-20260607-000123")).toEqual({
      scope: "buyer",
      page: "account",
      section: "orders",
      orderNumber: "DO-20260607-000123",
    });
    expect(resolveAppRoute("/guest-orders")).toEqual({
      scope: "buyer",
      page: "guest_orders",
    });
    expect(resolveAppRoute("/products/labubu-macaron")).toEqual({
      scope: "buyer",
      page: "product",
      productSlug: "labubu-macaron",
    });
    expect(resolveAppRoute("/admin")).toEqual({
      scope: "admin",
      page: "admin",
      section: "orders",
    });
  });

  it("does not expose admin as a buyer navigation route", () => {
    expect(resolveAppRoute("/admin/orders")).toEqual({
      scope: "admin",
      page: "admin",
      section: "orders",
    });
    expect(resolveAppRoute("/missing")).toEqual({
      scope: "buyer",
      page: "not_found",
    });
  });

  it("maps each post-purchase Admin workbench to a distinct section", () => {
    expect(resolveAppRoute("/admin/lifecycle")).toEqual({
      scope: "admin",
      page: "admin",
      section: "lifecycle",
    });
    expect(resolveAppRoute("/admin/inventory")).toEqual({
      scope: "admin",
      page: "admin",
      section: "inventory",
    });
    expect(resolveAppRoute("/admin/webhooks")).toEqual({
      scope: "admin",
      page: "admin",
      section: "webhooks",
    });
    expect(resolveAppRoute("/admin/diagnostics?tab=runtime")).toEqual({
      scope: "admin",
      page: "admin",
      section: "diagnostics",
    });
    expect(resolveAppRoute("/admin/unknown")).toEqual({
      scope: "admin",
      page: "admin",
      section: "orders",
    });
  });
});
