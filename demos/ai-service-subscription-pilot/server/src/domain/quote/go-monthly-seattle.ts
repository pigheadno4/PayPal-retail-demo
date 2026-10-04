export const GO_MONTHLY_SEATTLE_FIXTURE = Object.freeze({
  baseCents: 1000,
  promotionCents: -500,
  taxBasisPoints: 1055 as const,
  pricingVersion: "go-monthly-intro-v1",
  taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
  timeZone: "America/Los_Angeles" as const,
  locationKey: "us-wa-seattle",
  quoteLifetimeMinutes: 15,
  renewalMonths: 1,
});

export const GO_MONTHLY_SEATTLE_Q4_FIXTURE = Object.freeze({
  ...GO_MONTHLY_SEATTLE_FIXTURE,
  taxVersion: "us-wa-seattle-digital-ai-q4-2026-v1",
  effectiveFrom: "2026-10-01T07:00:00.000Z",
  effectiveUntil: "2027-01-01T08:00:00.000Z",
  sourceUrl: "https://dor.wa.gov/taxes-rates/sales-use-tax-rates/local-sales-use-tax/local-sales-use-tax-rate-table?page=3",
  retrievedAt: "2026-10-02",
  locationCode: 1726,
  stateBasisPoints: 650,
  localBasisPoints: 405,
  classificationSource: "design-system/research/2026-07-23-us-ai-service-tax-presets-q3.md",
  classification: "Existing approved fully automated browser-accessed B2C AI subscription treatment; not new legal advice",
});

const EFFECTIVE_ROWS = Object.freeze([
  Object.freeze({
    ...GO_MONTHLY_SEATTLE_FIXTURE,
    effectiveFrom: "2026-07-01T07:00:00.000Z",
    effectiveUntil: "2026-10-01T07:00:00.000Z",
  }),
  GO_MONTHLY_SEATTLE_Q4_FIXTURE,
]);

export type GoMonthlyQuoteDraft = Readonly<{
  baseCents: number;
  promotionCents: number;
  taxableSubtotalCents: number;
  taxBasisPoints: 1055;
  taxCents: number;
  totalCents: number;
  pricingVersion: string;
  taxVersion: string;
  issuedAt: string;
  expiresAt: string;
  renewsAt: string;
  allowanceResetsAt: string;
  timeZone: "America/Los_Angeles";
  locationKey: string;
}>;

export function createGoMonthlyQuote(
  clock: () => Date = () => new Date(),
): GoMonthlyQuoteDraft {
  const issuedAt = clock();
  const timestamp = issuedAt.getTime();
  const matches = EFFECTIVE_ROWS.filter((row) =>
    timestamp >= Date.parse(row.effectiveFrom) && timestamp < Date.parse(row.effectiveUntil),
  );
  if (!Number.isFinite(timestamp) || matches.length !== 1) throw new Error("stale_quote");
  const fixture = matches[0];
  const expiresAt = new Date(
    Math.min(timestamp + fixture.quoteLifetimeMinutes * 60_000, Date.parse(fixture.effectiveUntil)),
  );
  const renewsAt = new Date(issuedAt);
  renewsAt.setUTCMonth(renewsAt.getUTCMonth() + fixture.renewalMonths);
  const taxableSubtotalCents =
    fixture.baseCents + fixture.promotionCents;
  const taxCents = Math.round(
    taxableSubtotalCents * fixture.taxBasisPoints / 10_000,
  );

  return Object.freeze({
    baseCents: fixture.baseCents,
    promotionCents: fixture.promotionCents,
    taxableSubtotalCents,
    taxBasisPoints: fixture.taxBasisPoints,
    taxCents,
    totalCents: taxableSubtotalCents + taxCents,
    pricingVersion: fixture.pricingVersion,
    taxVersion: fixture.taxVersion,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    renewsAt: renewsAt.toISOString(),
    allowanceResetsAt: renewsAt.toISOString(),
    timeZone: fixture.timeZone,
    locationKey: fixture.locationKey,
  });
}
