export type MinorUnit = number;

export function assertMinorUnit(value: number, label = "amount"): MinorUnit {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer minor unit`);
  }
  return value;
}

export function addMinor(values: readonly number[]): MinorUnit {
  return values.reduce((total, value, index) => {
    return assertMinorUnit(total + assertMinorUnit(value, `amount ${index}`));
  }, 0);
}

export function subtractMinor(base: number, discount: number): MinorUnit {
  const result =
    assertMinorUnit(base, "base amount") -
    assertMinorUnit(discount, "subtract amount");
  if (result < 0) {
    throw new Error("negative money result is not allowed");
  }
  return result;
}

export function multiplyMinor(unitAmount: number, quantity: number): MinorUnit {
  assertMinorUnit(unitAmount, "unit amount");
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error("quantity must be a non-negative integer quantity");
  }
  return assertMinorUnit(unitAmount * quantity, "line amount");
}

export function calculateBasisPoints(
  amount: number,
  basisPoints: number,
): MinorUnit {
  assertMinorUnit(amount, "amount");
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new Error("basis points must be a non-negative integer");
  }
  return assertMinorUnit(Math.round((amount * basisPoints) / 10_000));
}
