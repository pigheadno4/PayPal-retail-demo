import { describe, expect, it } from "vitest";
import { addCalendarMonth } from "./calendar-month.js";

describe("funded calendar month", () => {
  it.each([
    ["2024-01-31T20:00:00.000Z", "2024-02-29T20:00:00.000Z"],
    ["2025-01-31T20:00:00.000Z", "2025-02-28T20:00:00.000Z"],
    ["2026-10-15T19:00:00.000Z", "2026-11-15T20:00:00.000Z"],
    ["2026-02-08T10:30:00.000Z", "2026-03-08T10:00:00.000Z"],
    ["2026-02-08T10:30:45.500Z", "2026-03-08T10:00:00.000Z"],
    ["2026-10-01T08:30:00.000Z", "2026-11-01T09:30:00.000Z"],
  ])("anchors %s to %s without fixed-day or UTC overflow", (start, end) => {
    expect(addCalendarMonth(start, "America/Los_Angeles")).toBe(end);
  });
});
