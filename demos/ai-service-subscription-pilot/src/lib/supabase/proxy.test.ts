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

  it("binds one checkout nonce to the request and directive-specific PayPal SDK plus FraudNet CSP", async () => {
    const request = { nextUrl: { pathname: "/checkout/intent" }, headers: new Headers(), cookies: { getAll: vi.fn(() => []), set: vi.fn() } };
    const response = await refreshSupabaseSession(request as never);
    const forwarded = nextResponse.mock.calls.at(-1)?.[0].request.headers as Headers;
    const nonce = forwarded.get("x-nonce");
    expect(nonce).toBeTruthy();
    const csp = response.headers.get("content-security-policy")!;
    expect(csp).toBe(buildCheckoutCsp(nonce!));
    const directives = Object.fromEntries(csp.split("; ").map((directive) => {
      const [name, ...values] = directive.split(" ");
      return [name, values];
    }));
    expect(directives["script-src"]).toEqual(expect.arrayContaining([
      "'self'", `'nonce-${nonce}'`, "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.venmo.com", "https://c.paypal.com",
    ]));
    expect(directives["connect-src"]).toEqual(expect.arrayContaining([
      "'self'", "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.venmo.com",
    ]));
    expect(directives["child-src"]).toEqual(expect.arrayContaining([
      "'self'", "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.venmo.com",
    ]));
    expect(directives["frame-src"]).toEqual(expect.arrayContaining([
      "'self'", "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.venmo.com", "https://c.paypal.com",
    ]));
    expect(directives["img-src"]).toEqual(expect.arrayContaining([
      "'self'", "data:", "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.venmo.com", "https://c.paypal.com", "https://b.stats.paypal.com",
    ]));
    expect(directives["style-src"]).toEqual(expect.arrayContaining([
      "'self'", `'nonce-${nonce}'`, "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.venmo.com",
    ]));
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
    expect(directives["style-src"]).not.toContain("'unsafe-inline'");
    expect(directives["style-src-attr"]).toBeUndefined();
  });

  it("limits the Next development inline-style exception to style-src", () => {
    vi.stubEnv("NODE_ENV", "development");
    const directives = Object.fromEntries(buildCheckoutCsp("request-nonce").split("; ").map((directive) => {
      const [name, ...values] = directive.split(" ");
      return [name, values];
    }));
    expect(directives["style-src"]).toContain("'unsafe-inline'");
    expect(directives["style-src"]).not.toContain("'nonce-request-nonce'");
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
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
