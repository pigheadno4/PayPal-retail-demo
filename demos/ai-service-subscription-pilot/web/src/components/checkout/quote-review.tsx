import { useEffect, useState } from "react";
import type { CheckoutReview } from "../../../../shared/src/checkout.js";
import type { PayPalCheckoutStatus } from "../../../../shared/src/paypal.js";
import { PaymentHandoff } from "./payment-handoff.js";
import { PayPalWalletButton } from "./paypal-wallet-button.js";

function money(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function boundary(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function operationIdAfterRetry(
  funding: PayPalCheckoutStatus["funding"],
  currentOperationId: string,
  createOperationId: () => string,
) {
  return funding === "failed" ? createOperationId() : currentOperationId;
}

export function canPreparePayPal(input: Readonly<{ stale: boolean; busy: boolean; accessToken: string; expiresAt: string }>, now = Date.now()) {
  return !input.stale && !input.busy && input.accessToken.trim().length > 0 && Date.parse(input.expiresAt) > now;
}

export function QuoteReview(props: Readonly<{
  review: CheckoutReview;
  stale: boolean;
  busy: boolean;
  accessToken: string;
  nonce: string;
  onReplace: () => void;
}>) {
  const { review } = props;
  const [now, setNow] = useState(Date.now);
  const [clockContext, setClockContext] = useState({ review, accessToken: props.accessToken, busy: props.busy, stale: props.stale });
  if (clockContext.review !== review || clockContext.accessToken !== props.accessToken || clockContext.busy !== props.busy || clockContext.stale !== props.stale) {
    setClockContext({ review, accessToken: props.accessToken, busy: props.busy, stale: props.stale });
    setNow(Date.now);
  }
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<PayPalCheckoutStatus | null>(null);
  const [operationId, setOperationId] = useState<string>(() => crypto.randomUUID());
  const [clientMetadataId] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const expired = !(Date.parse(review.expiresAt) > now);
  const stale = props.stale || expired;
  const prepare = canPreparePayPal({ ...props, expiresAt: review.expiresAt }, now);
  useEffect(() => {
    const deadline = Date.parse(review.expiresAt);
    if (!(deadline > Date.now())) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [review.expiresAt, now]);

  if (status) {
    return <PaymentHandoff status={status} onRetry={status.funding === "verified" ? undefined : () => {
      setOperationId(operationIdAfterRetry(status.funding, operationId, () => crypto.randomUUID()));
      setStatus(null);
    }} />;
  }
  if (verifying) {
    return (
      <section className="payment-verification" aria-live="polite" aria-busy="true">
        <p className="eyebrow">Payment approval received</p>
        <h2>Verifying payment…</h2>
        <p>Checkout is locked while the server verifies the authoritative PayPal capture.</p>
      </section>
    );
  }
  return (
    <section className="review-layout" aria-labelledby="review-heading">
      <div className="review-copy reading-surface" style={{ gridColumn: "1 / -1", order: 0 }}>
        <p className="eyebrow">Customer story · step 3</p>
        <h1 id="review-heading">Review your newly calculated order</h1>
        <p className="section-copy">Your identity is verified. This server-owned quote must remain current before the next task can begin.</p>
        {stale ? (
          <div className="warning-note" role="alert">
            <strong>Review expired</strong>
            <span>Refresh the commercial state before proceeding.</span>
          </div>
        ) : (
          <div className="status-note" role="status"><strong>Current review</strong> · expires {boundary(review.expiresAt, review.timeZone)}</div>
        )}
      </div>

      <aside className="summary-card reading-surface" style={{ order: 1 }} aria-label="Go Monthly price review">
        <div className="summary-heading"><span>Go</span><strong>Monthly</strong></div>
        <dl>
          <div><dt>Base price</dt><dd>{money(review.base.cents)}</dd></div>
          <div className="discount"><dt>First-month promotion</dt><dd>{money(review.promotion.cents)}</dd></div>
          <div><dt>Taxable subtotal</dt><dd>{money(review.taxableSubtotal.cents)}</dd></div>
          <div><dt>Seattle tax · {(review.taxBasisPoints / 100).toFixed(2)}%</dt><dd>{money(review.tax.cents)}</dd></div>
          <div className="total"><dt>Due today</dt><dd>{money(review.dueToday.cents)}</dd></div>
        </dl>
        <div className="quote-facts">
          <p><span>Renews</span><strong>{boundary(review.renewsAt, review.timeZone)}</strong></p>
          <p><span>Allowance resets</span><strong>{boundary(review.allowanceResetsAt, review.timeZone)}</strong></p>
          <p><span>Time zone</span><strong>{review.timeZone}</strong></p>
          <p><span>Evidence</span><strong>{review.pricingVersion} · {review.taxVersion}</strong></p>
        </div>
        {stale ? (
          <button className="primary-button" type="button" disabled={props.busy} onClick={props.onReplace}>
            {props.busy ? "Refreshing…" : "Refresh review"}
          </button>
        ) : null}
      </aside>

        {prepare ? (
          <article className="review-copy reading-surface" style={{ order: 2 }}>
          <div className="payment-lane">
            <p className="eyebrow">Pay securely with PayPal</p>
            <div className="status-note">
              <strong>Your recurring-payment terms</strong>
              <p>{money(review.dueToday.cents)} due today. Renews at $10.00 monthly plus then-applicable tax on {boundary(review.renewsAt, review.timeZone)} ({review.timeZone}).</p>
              <p>Wallet approval and authorization for future use are completed inside PayPal. Loading this region does not authorize payment, save your wallet or start your subscription.</p>
            </div>
              <PayPalWalletButton
                intentId={review.intentId}
                quoteId={review.quoteId}
                accessToken={props.accessToken}
                nonce={props.nonce}
                operationId={operationId}
                clientMetadataId={clientMetadataId}
                expiresAt={review.expiresAt}
                onOperationResolved={setOperationId}
                onVerifying={() => setVerifying(true)}
                onComplete={(next) => { setVerifying(false); setStatus(next); }}
                onPending={(next) => { setVerifying(false); setStatus(next); }}
                onCancel={() => { setVerifying(false); setStatus(null); }}
                onFailure={(operationId) => {
                  setVerifying(false);
                  setStatus({
                    operationId,
                    funding: "failed",
                    reusableReadiness: "failed",
                    customerMessage: "PayPal could not complete this payment. No access was granted.",
                  });
                }}
              />
          </div>
          </article>
        ) : null}
    </section>
  );
}
