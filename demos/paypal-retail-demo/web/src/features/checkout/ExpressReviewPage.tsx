export interface ExpressReviewAddress {
  readonly name: string;
  readonly line1: string;
  readonly line2: string;
  readonly country: string;
}

export interface ExpressReviewShippingOption {
  readonly label: string;
  readonly detail: string;
  readonly amountLabel: string;
}

export interface ExpressReviewItem {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly amountLabel: string;
}

export interface ExpressReviewTotalLine {
  readonly label: string;
  readonly amountLabel: string;
  readonly emphasis?: boolean;
}

export interface ExpressReviewAmountGuard {
  readonly status: "verified" | "blocked";
  readonly label: string;
  readonly body: string;
}

export interface ExpressReviewPageData {
  readonly sourceLabel: string;
  readonly merchantOrderNumber: string;
  readonly paypalOrderId: string;
  readonly paymentMethodLabel: string;
  readonly statusLabel: string;
  readonly shippingAddress: ExpressReviewAddress;
  readonly shippingOption: ExpressReviewShippingOption;
  readonly items: readonly ExpressReviewItem[];
  readonly totals: readonly ExpressReviewTotalLine[];
  readonly amountGuard: ExpressReviewAmountGuard;
}

export interface ExpressReviewCaptureState {
  readonly status: "idle" | "capturing" | "captured" | "error";
  readonly message?: string;
  readonly captureId?: string;
  readonly debugId?: string;
}

export interface ExpressReviewPageProps {
  readonly captureState?: ExpressReviewCaptureState;
  readonly data?: ExpressReviewPageData;
  readonly onConfirmCapture?: () => void;
}

export function ExpressReviewPage({
  captureState = { status: "idle" },
  data = defaultExpressReviewPageData,
  onConfirmCapture,
}: ExpressReviewPageProps) {
  const captureBlocked = data.amountGuard.status === "blocked";
  const captureBusy = captureState.status === "capturing";
  const captureComplete = captureState.status === "captured";
  const captureDisabled = captureBlocked || captureBusy || captureComplete;

  return (
    <div className="express-review-page">
      <header className="express-review-hero">
        <p className="homepage-eyebrow">{data.sourceLabel}</p>
        <h1>Review and Confirm</h1>
        <p>
          Review the synchronized delivery total from PayPal before capturing
          the payment.
        </p>
      </header>

      <section
        className="express-review-status"
        aria-label="Payment session status"
        data-amount-consistency={data.amountGuard.status}
      >
        <span>{data.statusLabel}</span>
        <strong>{data.amountGuard.label}</strong>
        <p>{data.amountGuard.body}</p>
      </section>

      <div className="express-review-layout">
        <section
          className="express-review-main"
          aria-label="Express order details"
        >
          <section className="express-review-section">
            <h2>Order</h2>
            <dl className="express-review-facts">
              <div aria-label={`Merchant order ${data.merchantOrderNumber}`}>
                <dt>Merchant order</dt>
                <dd>{data.merchantOrderNumber}</dd>
              </div>
              <div aria-label={`PayPal order ${data.paypalOrderId}`}>
                <dt>PayPal order</dt>
                <dd>{data.paypalOrderId}</dd>
              </div>
              <div aria-label={`Payment method ${data.paymentMethodLabel}`}>
                <dt>Payment method</dt>
                <dd>{data.paymentMethodLabel}</dd>
              </div>
            </dl>
          </section>

          <section className="express-review-section">
            <h2>Delivery</h2>
            <address>
              <strong>{data.shippingAddress.name}</strong>
              <span>{data.shippingAddress.line1}</span>
              <span>{data.shippingAddress.line2}</span>
              <span>{data.shippingAddress.country}</span>
            </address>
            <div className="express-review-shipping">
              <span>
                <strong>{data.shippingOption.label}</strong>
                <small>{data.shippingOption.detail}</small>
              </span>
              <b>{data.shippingOption.amountLabel}</b>
            </div>
          </section>

          <section className="express-review-section">
            <h2>Items</h2>
            <ul className="express-review-items">
              {data.items.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <b>{item.amountLabel}</b>
                </li>
              ))}
            </ul>
          </section>
        </section>

        <aside className="express-review-summary" aria-label="Final total">
          <h2>Final snapshot</h2>
          <dl>
            {data.totals.map((line) => (
              <div
                data-emphasis={line.emphasis ? "true" : "false"}
                key={line.label}
              >
                <dt>{line.label}</dt>
                <dd>{line.amountLabel}</dd>
              </div>
            ))}
          </dl>
          <button
            className="button button--primary"
            disabled={captureDisabled}
            onClick={onConfirmCapture}
            type="button"
          >
            {captureBusy ? "Capturing payment..." : "Confirm and pay"}
          </button>
          {captureState.message ? (
            <section
              aria-label="Payment capture status"
              className="express-review-capture-status"
              data-capture-status={captureState.status}
              role={captureState.status === "error" ? "alert" : "status"}
            >
              <strong>{captureState.message}</strong>
              {captureState.captureId ? (
                <span>{captureState.captureId}</span>
              ) : null}
              {captureState.debugId ? (
                <small>Debug reference: {captureState.debugId}</small>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export const defaultExpressReviewPageData: ExpressReviewPageData = {
  sourceLabel: "Delivery express from cart",
  merchantOrderNumber: "DO-20260607-000123",
  paypalOrderId: "9AB12345CD6789012",
  paymentMethodLabel: "PayPal",
  statusLabel: "Payment session synchronized",
  shippingAddress: {
    name: "Taylor Chen",
    line1: "88 Spring Street",
    line2: "New York, NY 10012",
    country: "United States",
  },
  shippingOption: {
    label: "Standard shipping",
    detail: "Arrives in 4-6 business days",
    amountLabel: "$5.00",
  },
  items: [
    {
      id: "line-1",
      name: "Labubu Have a Seat",
      detail: "Blind Boxes - Qty 1",
      amountLabel: "$12.99",
    },
    {
      id: "line-2",
      name: "Hirono Little Mischief",
      detail: "Plush - Qty 1",
      amountLabel: "$12.99",
    },
  ],
  totals: [
    {
      label: "Merchandise subtotal",
      amountLabel: "$25.98",
    },
    {
      label: "Shipping",
      amountLabel: "$5.00",
    },
    {
      label: "Promo",
      amountLabel: "-$3.00",
    },
    {
      label: "Tax",
      amountLabel: "$2.02",
    },
    {
      label: "Total",
      amountLabel: "$30.00",
      emphasis: true,
    },
  ],
  amountGuard: {
    status: "verified",
    label: "Amount verified",
    body: "Merchant total matches the synchronized PayPal order amount.",
  },
};
