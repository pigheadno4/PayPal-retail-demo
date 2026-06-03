import { describe, expect, it } from "vitest";

import { ApiClientError, createApiClient } from "./client.js";

describe("web API client", () => {
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
});

function responseJson(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
