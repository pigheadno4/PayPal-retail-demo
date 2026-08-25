import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, nextResponse } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  nextResponse: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/server", () => ({
  NextResponse: { next: nextResponse },
}));

import { buildCheckoutCsp, refreshSupabaseSession } from "./proxy";

describe("refreshSupabaseSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
    vi.stubEnv("NODE_ENV", "production");
    nextResponse.mockImplementation(() => ({
      cookies: { set: vi.fn() },
      headers: new Headers(),
    }));
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll(
            [{ name: "sb-access-token", value: "refreshed", options: {} }],
            {
              "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
              Expires: "0",
              Pragma: "no-cache",
            },
          );
          return { data: { user: null }, error: null };
        },
      },
    }));
  });

  it("binds one checkout nonce to the request and exact PayPal FraudNet CSP", async () => {
    const request = { nextUrl: { pathname: "/checkout/intent" }, headers: new Headers(), cookies: { getAll: vi.fn(() => []), set: vi.fn() } };
    const response = await refreshSupabaseSession(request as never);
    const forwarded = nextResponse.mock.calls.at(-1)?.[0].request.headers as Headers;
    const nonce = forwarded.get("x-nonce");
    expect(nonce).toBeTruthy();
    const csp = response.headers.get("content-security-policy")!;
    expect(csp).toBe(buildCheckoutCsp(nonce!));
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("https://c.paypal.com");
    expect(csp).toContain("https://b.stats.paypal.com");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("preserves Supabase refresh cache headers and secure cookies in production", async () => {
    const request = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
    };

    const response = await refreshSupabaseSession(request as never);
    const options = createServerClient.mock.calls[0]?.[2];

    expect(options.cookieOptions).toMatchObject({ sameSite: "lax", secure: true });
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
