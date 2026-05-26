import { assertMinorUnit } from "./money.js";

export interface Destination {
  readonly marketId: string;
  readonly countryCode: string;
  readonly state?: string | null;
  readonly county?: string | null;
  readonly postalCode?: string | null;
}

export interface ShippingOptionRow {
  readonly id: string;
  readonly marketId: string;
  readonly countryCode: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly serviceCode: string;
  readonly displayName: string;
  readonly amountMinor: number;
  readonly estimatedDaysMin: number;
  readonly estimatedDaysMax: number;
  readonly isActive: boolean;
}

export function selectEligibleShippingOptions(
  options: readonly ShippingOptionRow[],
  destination: Destination,
): ShippingOptionRow[] {
  return options
    .filter((option) => optionMatchesDestination(option, destination))
    .sort((left, right) => {
      const amountDiff = left.amountMinor - right.amountMinor;
      if (amountDiff !== 0) {
        return amountDiff;
      }
      return left.estimatedDaysMin - right.estimatedDaysMin;
    });
}

export function selectDefaultShippingOption(
  options: readonly ShippingOptionRow[],
  destination: Destination,
): ShippingOptionRow | undefined {
  return selectEligibleShippingOptions(options, destination)[0];
}

function optionMatchesDestination(
  option: ShippingOptionRow,
  destination: Destination,
): boolean {
  assertMinorUnit(option.amountMinor, "shipping amount");
  return (
    option.isActive &&
    option.marketId === destination.marketId &&
    option.countryCode === destination.countryCode &&
    matchesOptionalScope(option.state, destination.state) &&
    matchesOptionalScope(option.county, destination.county)
  );
}

function matchesOptionalScope(
  scopeValue: string | null,
  destinationValue?: string | null,
): boolean {
  return scopeValue === null || scopeValue === destinationValue;
}
