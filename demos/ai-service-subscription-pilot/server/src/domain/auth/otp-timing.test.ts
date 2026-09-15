import { describe, expect, it, vi } from "vitest";

import { createOtpTiming } from "./otp-timing";

describe("OTP retrieval timing privacy boundary", () => {
  it("emits only fixed stages, request-local markers and bounded elapsed times", () => {
    const rows: unknown[] = [];
    const clock = vi.spyOn(performance, "now").mockReturnValue(100);
    try {
      const trace = createOtpTiming((row) => { rows.push(row); });
      trace("request_entry");
      clock.mockReturnValue(50);
      trace("lookup_start");
      clock.mockReturnValue(1e10);
      trace("lookup_end");
      clock.mockReturnValue(Number.NaN);
      trace("response_close");
      trace("private-fixture" as "request_entry");
      const other = createOtpTiming((row) => { rows.push(row); });
      other("request_entry");
      expect(rows).toHaveLength(5);
      expect(rows.slice(0, 4)).toEqual([
        expect.objectContaining({ stage: "request_entry", elapsedMs: 0 }),
        expect.objectContaining({ stage: "lookup_start", elapsedMs: 0 }),
        expect.objectContaining({ stage: "lookup_end", elapsedMs: 60_000 }),
        expect.objectContaining({ stage: "response_close", elapsedMs: 0 }),
      ]);
      const records = rows as Record<string, unknown>[];
      expect(new Set(records.slice(0, 4).map((row) => row.requestMarker)).size).toBe(1);
      expect(records[4].requestMarker).not.toBe(records[0].requestMarker);
      for (const row of records) {
        expect(Object.keys(row).sort()).toEqual(["elapsedMs", "event", "requestMarker", "stage"]);
        expect(row.event).toBe("demo_otp_timing");
        expect(row.requestMarker).toMatch(/^[a-f0-9-]{36}$/);
      }
      expect(JSON.stringify(rows)).not.toContain("private-fixture");
    } finally { clock.mockRestore(); }
  });

  it("contains synchronous and asynchronous logger failures", async () => {
    expect(() => createOtpTiming(() => { throw new Error("private-error"); })("request_entry"))
      .not.toThrow();
    createOtpTiming(async () => { throw new Error("private-error"); })("lookup_start");
    await Promise.resolve();
  });
});
