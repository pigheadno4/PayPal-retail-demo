import type { PayPalCheckoutStatus, PayPalOperationStatus } from "../../../../shared/src/paypal.js";

export function PaymentHandoff({
  status,
  onRetry,
  onCheckStatus,
  checking = false,
  statusError = "",
}: Readonly<{ status: PayPalCheckoutStatus | PayPalOperationStatus; onRetry?: () => void; onCheckStatus?: () => void; checking?: boolean; statusError?: string }>) {
  const creation = "stage" in status && status.stage === "creation_unconfirmed";
  const orderCreated = "stage" in status && status.stage === "order_created";
  const heading = creation ? "PayPal order creation is unconfirmed" : orderCreated ? "PayPal order was created" : status.funding === "verified"
    ? "Preparing your Go workspace"
    : status.funding === "pending" ? "Confirming your payment" : "Payment was not completed";
  const funding = creation || orderCreated ? "Not verified" : status.funding === "verified" ? "Verified" : status.funding === "pending" ? "Pending" : "Failed";
  const readiness = status.reusableReadiness === "not_requested" ? "Not requested / not verified" : status.reusableReadiness === "ready" ? "Ready" : status.reusableReadiness === "failed" ? "Failed" : "Pending";

  return (
    <section className="payment-handoff" aria-live="polite">
      <p className="eyebrow">{status.funding === "verified" ? "Payment-to-activation handoff" : "Payment status"}</p>
      <h2>{heading}</h2>
      <div className="handoff-status"><span>Funding</span><strong>{funding}</strong></div>
      <div className="handoff-status"><span>Reusable payment readiness</span><strong>{readiness}</strong></div>
      <div className="handoff-status"><span>Workspace access</span><strong>{status.funding === "verified" ? "Ready to activate" : "Not granted yet"}</strong></div>
      <p className="status-note">{status.customerMessage}</p>
      {statusError ? <p className="status-note" role="alert">{statusError}</p> : null}
      {status.funding === "pending" && onCheckStatus ? (
        <button className="secondary-button" type="button" disabled={checking} aria-busy={checking} onClick={onCheckStatus}>
          {checking ? "Checking status…" : "Check payment status"}
        </button>
      ) : null}
      {status.funding === "verified" ? (
        <a className="primary-button" href="/workspace">Open Go workspace</a>
      ) : null}
      {status.funding === "failed" && onRetry ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          Try PayPal again
        </button>
      ) : null}
    </section>
  );
}
