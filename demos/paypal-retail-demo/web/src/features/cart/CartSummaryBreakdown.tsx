export interface CartSummaryBreakdownProps {
  readonly density?: "default" | "compact";
  readonly subtotalLabel: string;
}

export function CartSummaryBreakdown({
  density = "default",
  subtotalLabel,
}: CartSummaryBreakdownProps) {
  const classNames = [
    "cart-summary-breakdown",
    density === "compact" ? "cart-summary-breakdown--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <dl className={classNames}>
      <div className="cart-summary-breakdown__line cart-summary-breakdown__line--muted">
        <dt>Shipping</dt>
        <dd>Calculated after Delivery/Pickup</dd>
      </div>
      <div className="cart-summary-breakdown__line cart-summary-breakdown__line--muted">
        <dt>Promo / estimated tax</dt>
        <dd>Calculated in checkout</dd>
      </div>
      <div className="cart-summary-breakdown__total">
        <dt>Cart subtotal</dt>
        <dd>{subtotalLabel}</dd>
      </div>
      <p className="cart-summary-breakdown__note">
        Checkout total updates after Delivery/Pickup, promo, and tax are
        confirmed.
      </p>
    </dl>
  );
}
