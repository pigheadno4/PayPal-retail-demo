import type { PayPalCheckoutStatus } from "../../../../shared/src/paypal.js";

export function PaymentHandoff({
  status,
  onRetry,
}: Readonly<{ status: PayPalCheckoutStatus; onRetry?: () => void }>) {
  const heading = status.funding === "verified"
    ? "Preparing your Go workspace"
    : status.funding === "pending" ? "Confirming your payment" : "Payment was not completed";
  const funding = status.funding === "verified" ? "Verified" : status.funding === "pending" ? "Pending" : "Failed";
  const readiness = status.reusableReadiness === "ready" ? "Ready" : status.reusableReadiness === "failed" ? "Failed" : "Pending";

  return (
    <section className="payment-handoff" aria-live="polite">
      <p className="eyebrow">{status.funding === "verified" ? "Payment-to-activation handoff" : "Payment status"}</p>
      <h2>{heading}</h2>
      <div className="handoff-status"><span>Funding</span><strong>{funding}</strong></div>
      <div className="handoff-status"><span>Reusable payment readiness</span><strong>{readiness}</strong></div>
      <div className="handoff-status"><span>Workspace access</span><strong>{status.funding === "verified" ? "Ready to activate" : "Not granted yet"}</strong></div>
      <p className="status-note">{status.customerMessage}</p>
      {status.funding === "verified" ? (
        <a className="primary-button" href="/workspace">Open Go workspace</a>
      ) : null}
      {status.funding !== "verified" && onRetry ? (
        <button className="secondary-button" type="button" onClick={onRetry}>
          {status.funding === "pending" ? "Check payment status" : "Try PayPal again"}
        </button>
      ) : null}
    </section>
  );
}
