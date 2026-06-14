import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, createApiClient } from "./client.js";

describe("web API client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the Vite API base URL for default browser clients", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
    const calls: string[] = [];
    const client = createApiClient({
      fetch: async (url) => {
        calls.push(String(url));
        return responseJson({
          ok: true,
          data: { status: "ok" },
          debug_id: "dbg_env_base",
        });
      },
    });

    const result = await client.get("/api/paypal/sdk-config", {
      flow: "standard",
      market: "US",
      method: "paypal",
      page_type: "checkout",
    });

    expect(result).toEqual({ status: "ok" });
    expect(calls).toEqual([
      "http://localhost:3000/api/paypal/sdk-config?flow=standard&market=US&method=paypal&page_type=checkout",
    ]);
  });

  it("builds app API URLs with normalized query params", async () => {
    const calls: string[] = [];
    const client = createApiClient({
      baseUrl: "https://demo.example.test/",
      fetch: async (url) => {
        calls.push(String(url));
        return responseJson({
          ok: true,
          data: { status: "ok" },
          debug_id: "dbg_123",
        });
      },
    });

    const result = await client.get("/api/config", {
      market: "US",
      profile: "popmart",
    });

    expect(result).toEqual({ status: "ok" });
    expect(calls).toEqual([
      "https://demo.example.test/api/config?market=US&profile=popmart",
    ]);
  });

  it("throws a buyer-safe API error with debug id for app error envelopes", async () => {
    const client = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        responseJson(
          {
            ok: false,
            error: {
              code: "NOT_FOUND",
              message: "Not found.",
              details: { route: "/missing" },
            },
            debug_id: "dbg_missing",
          },
          404,
        ),
    });

    await expect(client.get("/missing")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "NOT_FOUND",
      message: "Not found.",
      debugId: "dbg_missing",
      status: 404,
    } satisfies Partial<ApiClientError>);
  });

  it("posts JSON app API requests with normalized query params", async () => {
    const calls: Array<{
      readonly url: string;
      readonly init: RequestInit;
    }> = [];
    const client = createApiClient({
      baseUrl: "https://demo.example.test/",
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          init: init ?? {},
        });
        return responseJson({
          ok: true,
          data: { paypal_order_id: "PAYPAL_ORDER_123" },
          debug_id: "dbg_post",
        });
      },
    });

    const result = await client.post(
      "/api/paypal/orders/delivery",
      {
        checkout_draft_id: "draft_delivery_123",
        method: "paypal",
      },
      {
        market: "US",
      },
    );

    expect(result).toEqual({ paypal_order_id: "PAYPAL_ORDER_123" });
    expect(calls).toEqual([
      {
        url: "https://demo.example.test/api/paypal/orders/delivery?market=US",
        init: {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            checkout_draft_id: "draft_delivery_123",
            method: "paypal",
          }),
        },
      },
    ]);
  });

  it("patches JSON app API requests with normalized query params", async () => {
    const calls: Array<{
      readonly url: string;
      readonly init: RequestInit;
    }> = [];
    const client = createApiClient({
      baseUrl: "https://demo.example.test/",
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          init: init ?? {},
        });
        return responseJson({
          ok: true,
          data: { quantity: 2 },
          debug_id: "dbg_patch",
        });
      },
    });

    const result = await client.patch(
      "/api/cart/items/cart_item_labubu",
      {
        quantity: 2,
      },
      {
        market: "US",
      },
    );

    expect(result).toEqual({ quantity: 2 });
    expect(calls).toEqual([
      {
        url: "https://demo.example.test/api/cart/items/cart_item_labubu?market=US",
        init: {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            quantity: 2,
          }),
        },
      },
    ]);
  });
});

function responseJson(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
