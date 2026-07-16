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

export interface TaxRateSelectionOptions {
  readonly allowPostalCountyFallback?: boolean;
}

export function selectTaxRate(
  rates: readonly TaxRateRow[],
  destination: Destination,
  options: TaxRateSelectionOptions = {},
): TaxRateRow | undefined {
  const rankedRates = rates
    .filter((rate) => rateMatchesDestination(rate, destination, options))
    .sort((left, right) => compareRateSpecificity(left, right, destination));

  if (!options.allowPostalCountyFallback || destination.county) {
    return rankedRates[0];
  }

  for (let index = 0; index < rankedRates.length; ) {
    const equallySpecificRates = rankedRates.slice(
      index,
      findNextSpecificityIndex(rankedRates, index, destination),
    );
    const countyNeutralRates = equallySpecificRates.filter(
      (rate) => rate.county === null,
    );
    const candidates =
      countyNeutralRates.length > 0 ? countyNeutralRates : equallySpecificRates;
    const selectedRate = selectRateWhenAmountsAgree(candidates);
    if (selectedRate) {
      return selectedRate;
    }
    index += equallySpecificRates.length;
  }

  return undefined;
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
  options: TaxRateSelectionOptions,
): boolean {
  return (
    rate.isActive &&
    rate.marketId === destination.marketId &&
    rate.countryCode === destination.countryCode &&
    matchesOptionalScope(rate.state, destination.state) &&
    matchesCountyScope(rate, destination, options) &&
    matchesPostalPrefix(rate.postalCodePrefix, destination.postalCode)
  );
}

function matchesCountyScope(
  rate: TaxRateRow,
  destination: Destination,
  options: TaxRateSelectionOptions,
): boolean {
  return (
    rate.county === null ||
    rate.county === destination.county ||
    (options.allowPostalCountyFallback === true &&
      !destination.county &&
      rate.postalCodePrefix !== null)
  );
}

function compareRateSpecificity(
  left: TaxRateRow,
  right: TaxRateRow,
  destination: Destination,
): number {
  const leftScore = specificityScore(left, destination);
  const rightScore = specificityScore(right, destination);
  for (let index = 0; index < leftScore.length; index += 1) {
    const difference = rightScore[index]! - leftScore[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  return left.id.localeCompare(right.id);
}

function specificityScore(
  rate: TaxRateRow,
  destination: Destination,
): readonly number[] {
  return [
    rate.postalCodePrefix?.length ?? 0,
    destination.county && rate.county === destination.county ? 1 : 0,
    rate.state ? 1 : 0,
    rate.countryCode ? 1 : 0,
  ];
}

function findNextSpecificityIndex(
  rankedRates: readonly TaxRateRow[],
  startIndex: number,
  destination: Destination,
): number {
  const firstScore = specificityScore(rankedRates[startIndex]!, destination);
  let index = startIndex + 1;
  while (
    index < rankedRates.length &&
    specificityScoresEqual(
      firstScore,
      specificityScore(rankedRates[index]!, destination),
    )
  ) {
    index += 1;
  }
  return index;
}

function specificityScoresEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return left.every((value, index) => value === right[index]);
}

function selectRateWhenAmountsAgree(
  rates: readonly TaxRateRow[],
): TaxRateRow | undefined {
  const firstRate = rates[0];
  if (!firstRate) {
    return undefined;
  }
  return rates.every((rate) => rate.rateBps === firstRate.rateBps)
    ? firstRate
    : undefined;
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
