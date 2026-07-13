import { describe, expect, it } from "vitest";

import { parseBuyerSafeLifecycleNote } from "../src/lifecycleNote.js";

describe("buyer-safe lifecycle notes", () => {
  it.each([
    ["short payment-session ID", "payment_session_1", "technical_identifier"],
    [
      "leading control character",
      "\tPacked for dispatch.",
      "control_characters",
    ],
    [
      "trailing control character",
      "Packed for dispatch.\n",
      "control_characters",
    ],
    ["invalid input type", 42, "invalid_type"],
  ] as const)("rejects %s", (_label, value, reason) => {
    expect(parseBuyerSafeLifecycleNote(value)).toEqual({
      ok: false,
      reason,
    });
  });

  it("accepts safe hyphenated buyer prose", () => {
    expect(
      parseBuyerSafeLifecycleNote("Debug-friendly packing complete."),
    ).toEqual({
      ok: true,
      note: "Debug-friendly packing complete.",
    });
  });
});
