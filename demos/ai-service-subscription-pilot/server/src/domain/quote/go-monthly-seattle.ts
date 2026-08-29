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
  const expiresAt = new Date(
    issuedAt.getTime() + GO_MONTHLY_SEATTLE_FIXTURE.quoteLifetimeMinutes * 60_000,
  );
  const renewsAt = new Date(issuedAt);
  renewsAt.setUTCMonth(renewsAt.getUTCMonth() + GO_MONTHLY_SEATTLE_FIXTURE.renewalMonths);
  const taxableSubtotalCents =
    GO_MONTHLY_SEATTLE_FIXTURE.baseCents + GO_MONTHLY_SEATTLE_FIXTURE.promotionCents;
  const taxCents = Math.round(
    taxableSubtotalCents * GO_MONTHLY_SEATTLE_FIXTURE.taxBasisPoints / 10_000,
  );

  return Object.freeze({
    baseCents: GO_MONTHLY_SEATTLE_FIXTURE.baseCents,
    promotionCents: GO_MONTHLY_SEATTLE_FIXTURE.promotionCents,
    taxableSubtotalCents,
    taxBasisPoints: GO_MONTHLY_SEATTLE_FIXTURE.taxBasisPoints,
    taxCents,
    totalCents: taxableSubtotalCents + taxCents,
    pricingVersion: GO_MONTHLY_SEATTLE_FIXTURE.pricingVersion,
    taxVersion: GO_MONTHLY_SEATTLE_FIXTURE.taxVersion,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    renewsAt: renewsAt.toISOString(),
    allowanceResetsAt: renewsAt.toISOString(),
    timeZone: GO_MONTHLY_SEATTLE_FIXTURE.timeZone,
    locationKey: GO_MONTHLY_SEATTLE_FIXTURE.locationKey,
  });
}
