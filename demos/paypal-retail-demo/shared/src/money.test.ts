import { describe, expect, it } from "vitest";
import {
  addMinor,
  calculateBasisPoints,
  multiplyMinor,
  subtractMinor,
} from "./money.js";

describe("money helpers", () => {
  it("uses integer minor-unit arithmetic", () => {
    expect(addMinor([1999, 595, 0])).toBe(2594);
    expect(subtractMinor(2594, 500)).toBe(2094);
    expect(multiplyMinor(1299, 3)).toBe(3897);
  });

  it("rounds basis-point calculations to the nearest minor unit", () => {
    expect(calculateBasisPoints(3333, 825)).toBe(275);
    expect(calculateBasisPoints(999, 1000)).toBe(100);
    expect(calculateBasisPoints(1200, 0)).toBe(0);
  });

  it("rejects unsafe or fractional minor-unit values", () => {
    expect(() => addMinor([100, 1.5])).toThrow("integer minor unit");
    expect(() => subtractMinor(100, 150)).toThrow("negative money result");
    expect(() => multiplyMinor(100, 1.2)).toThrow("integer quantity");
    expect(() => calculateBasisPoints(100, -1)).toThrow("basis points");
  });
});
