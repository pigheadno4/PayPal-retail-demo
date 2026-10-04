import { describe, expect, it } from "vitest";
import { canPreparePayPal } from "./quote-review.js";

describe("current authenticated review preparation", () => {
  const input = { stale: false, busy: false, accessToken: "synthetic-credential", expiresAt: "2026-10-04T01:00:00Z" };
  const now = Date.parse("2026-10-04T00:59:00Z");
  it("allows preparation without payment authorization", () => expect(canPreparePayPal(input, now)).toBe(true));
  it.each([
    { stale: true }, { busy: true }, { accessToken: "" }, { accessToken: "  " },
    { expiresAt: "invalid" }, { expiresAt: "2026-10-04T00:59:00Z" },
  ])("denies unavailable review %#", (change) => expect(canPreparePayPal({ ...input, ...change }, now)).toBe(false));
});
