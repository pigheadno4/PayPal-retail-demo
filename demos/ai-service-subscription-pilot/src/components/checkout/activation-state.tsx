import type { PayPalCheckoutStatus } from "@/contracts/paypal";

export function ActivationState({ status, onRetry }: { status: PayPalCheckoutStatus; onRetry?: () => void }) {
  const heading = status.funding === "verified"
    ? "Preparing your Go workspace"
    : status.funding === "pending" ? "Confirming your payment" : "Payment was not completed";
  const label = status.funding === "verified" ? "Verified" : status.funding === "pending" ? "Pending" : "Failed";
  const readiness = status.reusableReadiness === "ready" ? "Ready" : status.reusableReadiness === "failed" ? "Failed" : "Pending";
  return <section className="activation-state" aria-live="polite"><p className="step">{status.funding === "verified" ? "Payment-to-activation handoff" : "Payment status"}</p><h2>{heading}</h2><div className="status-row"><span>Funding</span><strong>{label}</strong></div><div className="status-row"><span>Reusable payment readiness</span><strong>{readiness}</strong></div><div className="status-row"><span>Workspace access</span><strong>Not granted yet</strong></div><p className="safe-note">{status.customerMessage}</p>{status.funding !== "verified" && onRetry && <button type="button" onClick={onRetry}>{status.funding === "pending" ? "Check payment status" : "Try PayPal again"}</button>}</section>;
}
