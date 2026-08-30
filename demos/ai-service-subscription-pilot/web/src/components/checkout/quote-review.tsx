import { useState } from "react";
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

export function QuoteReview(props: Readonly<{
  review: CheckoutReview;
  stale: boolean;
  busy: boolean;
  accessToken: string;
  nonce: string;
  onReplace: () => void;
}>) {
  const { review } = props;
  const [consented, setConsented] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<PayPalCheckoutStatus | null>(null);
  const [operationId, setOperationId] = useState<string>(() => crypto.randomUUID());
  const [clientMetadataId] = useState(() => crypto.randomUUID().replaceAll("-", ""));

  if (status) {
    return <PaymentHandoff status={status} onRetry={status.funding === "verified" ? undefined : () => setStatus(null)} />;
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
      <article className="review-copy reading-surface">
        <p className="eyebrow">Customer story · step 3</p>
        <h1 id="review-heading">Review your newly calculated order</h1>
        <p className="section-copy">Your identity is verified. This server-owned quote must remain current before the next task can begin.</p>
        {props.stale ? (
          <div className="warning-note" role="alert">
            <strong>Review expired</strong>
            <span>Refresh the commercial state before proceeding.</span>
          </div>
        ) : (
          <div className="status-note" role="status"><strong>Current review</strong> · expires {boundary(review.expiresAt, review.timeZone)}</div>
        )}
        {!props.stale ? (
          <div className="payment-lane">
            <p className="eyebrow">Pay securely with PayPal</p>
            <label className="consent-control">
              <input
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.currentTarget.checked)}
              />
              <span>Save my PayPal Wallet for future recurring Go payments.</span>
            </label>
            {consented ? (
              <PayPalWalletButton
                intentId={review.intentId}
                quoteId={review.quoteId}
                accessToken={props.accessToken}
                nonce={props.nonce}
                operationId={operationId}
                clientMetadataId={clientMetadataId}
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
            ) : <p className="muted">Confirm consent to load the official PayPal control.</p>}
          </div>
        ) : null}
      </article>

      <aside className="summary-card reading-surface" aria-label="Go Monthly price review">
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
        {props.stale ? (
          <button className="primary-button" type="button" disabled={props.busy} onClick={props.onReplace}>
            {props.busy ? "Refreshing…" : "Refresh review"}
          </button>
        ) : null}
      </aside>
    </section>
  );
}
