import {
  assertMinorUnit,
  calculateBasisPoints,
  subtractMinor,
  type MinorUnit,
} from "./money.js";
import type { Destination } from "./shipping.js";

export type PromoType = "auto" | "manual";
export type PromoDiscountType = "percent" | "fixed_amount";
export type PromoCompatibility = "compatible" | "exclusive";
export type PromoScopeMode = "include" | "exclude";
export type PromoRejectionReason =
  | "inactive"
  | "expired"
  | "manual_code_not_requested"
  | "below_minimum"
  | "region_not_match"
  | "product_excluded"
  | "exclusive_conflict";

export interface PromoRuleRow {
  readonly id: string;
  readonly code: string;
  readonly promoType: PromoType;
  readonly discountType: PromoDiscountType;
  readonly discountValue: number;
  readonly minMerchandiseSubtotalMinor: number;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly isStackable: boolean;
  readonly priority: number;
  readonly isActive: boolean;
}

export interface PromoRuleRegionRow {
  readonly promoRuleId: string;
  readonly countryCode: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postalCodePrefix: string | null;
  readonly includeExclude: PromoScopeMode;
}

export interface PromoRuleProductRow {
  readonly promoRuleId: string;
  readonly productId: string | null;
  readonly categoryId: string | null;
  readonly includeExclude: PromoScopeMode;
}

export interface PromoCompatibilityRow {
  readonly promoRuleId: string;
  readonly compatiblePromoRuleId: string;
  readonly compatibility: PromoCompatibility;
}

export interface PromoLineInput {
  readonly productId: string;
  readonly categoryId: string;
  readonly subtotalMinor: number;
}

export interface PromoEvaluationInput {
  readonly at: Date | string;
  readonly merchandiseSubtotalMinor: number;
  readonly shippingMinor: number;
  readonly manualCodes: readonly string[];
  readonly selectedCodes?: readonly string[];
  readonly destination: Omit<Destination, "marketId">;
  readonly lines: readonly PromoLineInput[];
  readonly rules: readonly PromoRuleRow[];
  readonly regionScopes?: readonly PromoRuleRegionRow[];
  readonly productScopes?: readonly PromoRuleProductRow[];
  readonly compatibility?: readonly PromoCompatibilityRow[];
}

export interface PromoRejectedResult {
  readonly code: string;
  readonly reason: PromoRejectionReason;
}

export interface PromoCandidateSet {
  readonly codes: readonly string[];
  readonly discountMinor: MinorUnit;
  readonly taxableSubtotalMinor: MinorUnit;
  readonly finalTotalMinor: MinorUnit;
  readonly recommended: boolean;
}

export interface PromoEvaluationResult {
  readonly recommendedSet: readonly string[];
  readonly selectedSet: readonly string[];
  readonly candidateSets: readonly PromoCandidateSet[];
  readonly matchedPromos: readonly string[];
  readonly rejectedPromos: readonly PromoRejectedResult[];
  readonly merchandiseDiscountMinor: MinorUnit;
  readonly taxableSubtotalMinor: MinorUnit;
  readonly finalTotalMinor: MinorUnit;
}

interface EligiblePromo {
  readonly rule: PromoRuleRow;
  readonly discountBaseMinor: MinorUnit;
}

export function evaluatePromos(
  input: PromoEvaluationInput,
): PromoEvaluationResult {
  const merchandiseSubtotalMinor = assertMinorUnit(
    input.merchandiseSubtotalMinor,
    "merchandise subtotal",
  );
  assertMinorUnit(input.shippingMinor, "shipping amount");

  const at = toDate(input.at);
  const manualCodes = new Set(
    input.manualCodes.map((code) => code.toUpperCase()),
  );
  const rejectedPromos: PromoRejectedResult[] = [];
  const eligiblePromos: EligiblePromo[] = [];

  for (const rule of input.rules) {
    const rejectionReason = getRuleRejectionReason(
      rule,
      input,
      at,
      manualCodes,
      merchandiseSubtotalMinor,
    );
    if (rejectionReason) {
      rejectedPromos.push({ code: rule.code, reason: rejectionReason });
    } else {
      eligiblePromos.push({
        rule,
        discountBaseMinor: getDiscountBaseMinor(rule, input),
      });
    }
  }

  const candidateSets = buildCandidateSets(
    eligiblePromos,
    merchandiseSubtotalMinor,
    input.compatibility ?? [],
  );
  const recommendedSet = candidateSets[0] ?? null;
  const selectedSet =
    findSelectedCandidateSet(candidateSets, input.selectedCodes) ??
    recommendedSet;

  return {
    recommendedSet: recommendedSet?.codes ?? [],
    selectedSet: selectedSet?.codes ?? [],
    candidateSets: candidateSets.map((candidate) => ({
      ...candidate,
      recommended: candidate === recommendedSet,
    })),
    matchedPromos: eligiblePromos.map((promo) => promo.rule.code),
    rejectedPromos,
    merchandiseDiscountMinor: selectedSet?.discountMinor ?? 0,
    taxableSubtotalMinor:
      selectedSet?.taxableSubtotalMinor ?? merchandiseSubtotalMinor,
    finalTotalMinor: selectedSet?.finalTotalMinor ?? merchandiseSubtotalMinor,
  };
}

function getRuleRejectionReason(
  rule: PromoRuleRow,
  input: PromoEvaluationInput,
  at: Date,
  manualCodes: ReadonlySet<string>,
  merchandiseSubtotalMinor: MinorUnit,
): PromoRejectionReason | null {
  if (!rule.isActive) {
    return "inactive";
  }
  if (!isInTimeWindow(rule, at)) {
    return "expired";
  }
  if (rule.promoType === "manual" && !manualCodes.has(rule.code)) {
    return "manual_code_not_requested";
  }
  if (merchandiseSubtotalMinor < rule.minMerchandiseSubtotalMinor) {
    return "below_minimum";
  }
  if (!passesRegionScopes(rule, input)) {
    return "region_not_match";
  }
  if (!passesProductScopes(rule, input)) {
    return "product_excluded";
  }
  return null;
}

function buildCandidateSets(
  eligiblePromos: readonly EligiblePromo[],
  merchandiseSubtotalMinor: MinorUnit,
  compatibilityRows: readonly PromoCompatibilityRow[],
): PromoCandidateSet[] {
  const candidates: PromoCandidateSet[] = [];
  for (const subset of nonEmptySubsets(eligiblePromos)) {
    if (!isCompatibleSet(subset, compatibilityRows)) {
      continue;
    }
    const discountMinor = Math.min(
      merchandiseSubtotalMinor,
      subset.reduce((total, promo) => total + discountForPromo(promo), 0),
    );
    const taxableSubtotalMinor = subtractMinor(
      merchandiseSubtotalMinor,
      discountMinor,
    );
    candidates.push({
      codes: subset.map((promo) => promo.rule.code),
      discountMinor,
      taxableSubtotalMinor,
      finalTotalMinor: taxableSubtotalMinor,
      recommended: false,
    });
  }
  return candidates.sort((left, right) => {
    const discountDiff = right.discountMinor - left.discountMinor;
    if (discountDiff !== 0) {
      return discountDiff;
    }
    return left.codes.join(",").localeCompare(right.codes.join(","));
  });
}

function isCompatibleSet(
  set: readonly EligiblePromo[],
  compatibilityRows: readonly PromoCompatibilityRow[],
): boolean {
  if (set.length === 1) {
    return true;
  }
  if (set.some((promo) => !promo.rule.isStackable)) {
    return false;
  }
  for (let leftIndex = 0; leftIndex < set.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < set.length;
      rightIndex += 1
    ) {
      const left = set[leftIndex]!.rule.id;
      const right = set[rightIndex]!.rule.id;
      const compatibility = findCompatibility(left, right, compatibilityRows);
      if (compatibility !== "compatible") {
        return false;
      }
    }
  }
  return true;
}

function findCompatibility(
  left: string,
  right: string,
  compatibilityRows: readonly PromoCompatibilityRow[],
): PromoCompatibility | undefined {
  return compatibilityRows.find(
    (row) =>
      (row.promoRuleId === left && row.compatiblePromoRuleId === right) ||
      (row.promoRuleId === right && row.compatiblePromoRuleId === left),
  )?.compatibility;
}

function findSelectedCandidateSet(
  candidateSets: readonly PromoCandidateSet[],
  selectedCodes?: readonly string[],
): PromoCandidateSet | null {
  if (!selectedCodes || selectedCodes.length === 0) {
    return null;
  }
  const normalizedSelectedCodes = normalizeCodes(selectedCodes).join("|");
  return (
    candidateSets.find(
      (candidate) =>
        normalizeCodes(candidate.codes).join("|") === normalizedSelectedCodes,
    ) ?? null
  );
}

function normalizeCodes(codes: readonly string[]): string[] {
  return [...codes].map((code) => code.toUpperCase()).sort();
}

function discountForPromo(promo: EligiblePromo): MinorUnit {
  return promo.rule.discountType === "percent"
    ? calculateBasisPoints(promo.discountBaseMinor, promo.rule.discountValue)
    : Math.min(promo.rule.discountValue, promo.discountBaseMinor);
}

function passesRegionScopes(
  rule: PromoRuleRow,
  input: PromoEvaluationInput,
): boolean {
  const scopes = (input.regionScopes ?? []).filter(
    (scope) => scope.promoRuleId === rule.id,
  );
  if (scopes.length === 0) {
    return true;
  }
  const matchedScopes = scopes.filter((scope) =>
    regionScopeMatches(scope, input.destination),
  );
  if (matchedScopes.some((scope) => scope.includeExclude === "exclude")) {
    return false;
  }
  const includeScopes = scopes.filter(
    (scope) => scope.includeExclude === "include",
  );
  return includeScopes.length === 0 || matchedScopes.length > 0;
}

function passesProductScopes(
  rule: PromoRuleRow,
  input: PromoEvaluationInput,
): boolean {
  const scopes = (input.productScopes ?? []).filter(
    (scope) => scope.promoRuleId === rule.id,
  );
  if (scopes.length === 0) {
    return true;
  }
  const matchedScopes = scopes.filter((scope) =>
    input.lines.some((line) => productScopeMatches(scope, line)),
  );
  if (matchedScopes.some((scope) => scope.includeExclude === "exclude")) {
    return false;
  }
  const includeScopes = scopes.filter(
    (scope) => scope.includeExclude === "include",
  );
  return includeScopes.length === 0 || matchedScopes.length > 0;
}

function getDiscountBaseMinor(
  rule: PromoRuleRow,
  input: PromoEvaluationInput,
): MinorUnit {
  const includeScopes = (input.productScopes ?? []).filter(
    (scope) =>
      scope.promoRuleId === rule.id && scope.includeExclude === "include",
  );
  if (includeScopes.length === 0) {
    return assertMinorUnit(
      input.merchandiseSubtotalMinor,
      "merchandise subtotal",
    );
  }
  return input.lines.reduce((total, line) => {
    const lineSubtotal = assertMinorUnit(line.subtotalMinor, "line subtotal");
    return includeScopes.some((scope) => productScopeMatches(scope, line))
      ? total + lineSubtotal
      : total;
  }, 0);
}

function regionScopeMatches(
  scope: PromoRuleRegionRow,
  destination: PromoEvaluationInput["destination"],
): boolean {
  return (
    scope.countryCode === destination.countryCode &&
    matchesOptionalScope(scope.state, destination.state) &&
    matchesOptionalScope(scope.county, destination.county) &&
    matchesPostalPrefix(scope.postalCodePrefix, destination.postalCode)
  );
}

function productScopeMatches(
  scope: PromoRuleProductRow,
  line: PromoLineInput,
): boolean {
  return (
    (scope.productId !== null && scope.productId === line.productId) ||
    (scope.categoryId !== null && scope.categoryId === line.categoryId)
  );
}

function isInTimeWindow(rule: PromoRuleRow, at: Date): boolean {
  const startsAt = rule.startsAt ? toDate(rule.startsAt) : null;
  const endsAt = rule.endsAt ? toDate(rule.endsAt) : null;
  return (!startsAt || startsAt <= at) && (!endsAt || endsAt > at);
}

function nonEmptySubsets<T>(items: readonly T[]): T[][] {
  const subsets: T[][] = [];
  const total = 1 << items.length;
  for (let mask = 1; mask < total; mask += 1) {
    subsets.push(items.filter((_, index) => Boolean(mask & (1 << index))));
  }
  return subsets;
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

function toDate(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("date must be valid");
  }
  return date;
}
