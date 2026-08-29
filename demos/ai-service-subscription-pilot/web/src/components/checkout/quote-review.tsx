import type { CheckoutReview } from "../../../../shared/src/checkout.js";

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
  onReplace: () => void;
}>) {
  const { review } = props;
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
        <div className="boundary-card">
          <strong>Payment step not started</strong>
          <span>No provider request or payment operation exists in this task.</span>
        </div>
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
