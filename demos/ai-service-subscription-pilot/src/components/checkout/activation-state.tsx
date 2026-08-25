import type { PayPalCheckoutStatus } from "@/contracts/paypal";

export function ActivationState({ status }: { status: PayPalCheckoutStatus }) {
  const ready = status.reusableReadiness === "ready";
  return <section className="activation-state" aria-live="polite"><p className="step">Payment-to-activation handoff</p><h2>Preparing your Go workspace</h2><div className="status-row"><span>Funding</span><strong>Verified</strong></div><div className="status-row"><span>Reusable payment readiness</span><strong>{ready ? "Ready" : "Pending"}</strong></div><div className="status-row"><span>Workspace access</span><strong>Not granted yet</strong></div><p className="safe-note">{ready ? "vault token verified; future-charge path documented" : "Payment verified. Reusable payment setup is finishing."}</p></section>;
}
