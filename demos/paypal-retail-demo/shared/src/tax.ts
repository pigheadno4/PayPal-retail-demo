import {
  assertMinorUnit,
  calculateBasisPoints,
  subtractMinor,
  type MinorUnit,
} from "./money.js";
import type { Destination } from "./shipping.js";

export interface TaxRateRow {
  readonly id: string;
  readonly marketId: string;
  readonly countryCode: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postalCodePrefix: string | null;
  readonly rateBps: number;
  readonly isActive: boolean;
}

export interface TaxCalculationInput {
  readonly merchandiseSubtotalMinor: number;
  readonly promoDiscountMinor: number;
  readonly shippingMinor: number;
  readonly rateBps: number;
}

export interface TaxCalculationResult {
  readonly taxableSubtotalMinor: MinorUnit;
  readonly taxMinor: MinorUnit;
  readonly shippingMinor: MinorUnit;
}

export function selectTaxRate(
  rates: readonly TaxRateRow[],
  destination: Destination,
): TaxRateRow | undefined {
  return rates
    .filter((rate) => rateMatchesDestination(rate, destination))
    .sort((left, right) => specificityScore(right) - specificityScore(left))[0];
}

export function calculateEstimatedTax(
  input: TaxCalculationInput,
): TaxCalculationResult {
  const merchandiseSubtotalMinor = assertMinorUnit(
    input.merchandiseSubtotalMinor,
    "merchandise subtotal",
  );
  const promoDiscountMinor = assertMinorUnit(
    input.promoDiscountMinor,
    "promo discount",
  );
  const shippingMinor = assertMinorUnit(input.shippingMinor, "shipping amount");
  const taxableSubtotalMinor = subtractMinor(
    merchandiseSubtotalMinor,
    promoDiscountMinor,
  );
  return {
    taxableSubtotalMinor,
    taxMinor: calculateBasisPoints(taxableSubtotalMinor, input.rateBps),
    shippingMinor,
  };
}

function rateMatchesDestination(
  rate: TaxRateRow,
  destination: Destination,
): boolean {
  return (
    rate.isActive &&
    rate.marketId === destination.marketId &&
    rate.countryCode === destination.countryCode &&
    matchesOptionalScope(rate.state, destination.state) &&
    matchesOptionalScope(rate.county, destination.county) &&
    matchesPostalPrefix(rate.postalCodePrefix, destination.postalCode)
  );
}

function specificityScore(rate: TaxRateRow): number {
  return [
    rate.countryCode,
    rate.state,
    rate.county,
    rate.postalCodePrefix,
  ].filter(Boolean).length;
}

function matchesOptionalScope(
  scopeValue: string | null,
  destinationValue?: string | null,
): boolean {
  return scopeValue === null || scopeValue === destinationValue;
}

function matchesPostalPrefix(
  prefix: string | null,
  postalCode?: string | null,
): boolean {
  return prefix === null || Boolean(postalCode?.startsWith(prefix));
}
