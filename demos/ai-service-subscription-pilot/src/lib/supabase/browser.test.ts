import { beforeEach, describe, expect, it, vi } from "vitest";

const { createBrowserClient } = vi.hoisted(() => ({ createBrowserClient: vi.fn() }));

vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

import { createBrowserSupabaseClient } from "./browser";

describe("createBrowserSupabaseClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
  });

  it("uses secure cookies in production and permits localhost development", () => {
    vi.stubEnv("NODE_ENV", "production");
    createBrowserSupabaseClient();
    expect(createBrowserClient.mock.calls[0]?.[2]?.cookieOptions).toMatchObject({
      sameSite: "lax",
      secure: true,
    });

    vi.stubEnv("NODE_ENV", "development");
    createBrowserSupabaseClient();
    expect(createBrowserClient.mock.calls[1]?.[2]?.cookieOptions).toMatchObject({
      sameSite: "lax",
      secure: false,
    });
  });
});
