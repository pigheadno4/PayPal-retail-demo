import { useEffect, useRef, useState } from "react";
import type { PayPalWallet } from "../../../../shared/src/paypal.js";
import { demoApi } from "../../lib/api.js";

const messages: Record<PayPalWallet["state"], string> = {
  ready: "Saved for future Go payments.",
  removing: "Future charging is blocked locally. PayPal cleanup has not been confirmed. Do not submit again.",
  removed: "PayPal confirmed removal. No saved wallet available for future payments.",
  rejected: "PayPal declined the cleanup. Future charging remains blocked locally; provider removal is not confirmed.",
  unknown: "PayPal cleanup could not be confirmed. Future charging remains blocked locally. No automatic retry will be made.",
};

export function PaymentMethodView(props: Readonly<{
  wallet: PayPalWallet | null; loading: boolean; busy: boolean; error: string | null;
  onConfirm: () => Promise<void> | void;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const confirming = useRef(false);
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  async function confirm() {
    if (confirming.current || props.busy) return;
    confirming.current = true;
    try { await props.onConfirm(); } finally {
      confirming.current = false;
      dialog.current?.close();
      status.current?.focus();
    }
  }
  return <section className="payment-method reading-surface" aria-labelledby="payment-method-title" data-state={props.busy ? "removing" : props.wallet?.state ?? "unavailable"}>
    <p className="eyebrow">Saved wallet</p>
    <h2 id="payment-method-title">Payment method</h2>
    {props.loading ? <p role="status">Loading payment method…</p> : null}
    {props.error ? <p role="alert" className="error-note">{props.error}</p> : null}
    {props.wallet ? <>
      <strong>PayPal Wallet{props.wallet.lastFour ? ` · •••• ${props.wallet.lastFour}` : ""}</strong>
      <p ref={status} tabIndex={-1} role="status" aria-live="polite">{props.error ? "Removal status needs confirmation." : props.busy ? "Removing…" : messages[props.wallet.state]}</p>
      <p>Your paid service remains available through <time dateTime={props.wallet.paidThrough}>{new Date(props.wallet.paidThrough).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time>. Your allowance is unchanged.</p>
      <p>Future payments: {props.wallet.renewalReady && !props.busy && !props.error ? "wallet ready" : "wallet not available"}.</p>
      {props.wallet.state === "ready" && !props.error ? <button ref={trigger} className="wallet-danger" type="button" disabled={props.busy} onClick={() => dialog.current?.showModal()}>Remove wallet</button> : null}
    </> : !props.loading && !props.error ? <p>No eligible saved wallet for this paid subscription.</p> : null}
    <dialog ref={dialog} className="wallet-dialog" aria-labelledby="wallet-confirm-title" aria-describedby="wallet-confirm-description" onCancel={(event) => { event.preventDefault(); if (!props.busy && !confirming.current) close(); }}>
      <h2 id="wallet-confirm-title">Remove your saved PayPal wallet?</h2>
      <p id="wallet-confirm-description">This wallet will no longer be used for future payments. Your subscription and already-paid service period stay unchanged.</p>
      <p className="wallet-notice">Before a future payment, you will need to authorize a payment method again. This does not cancel your subscription or change your allowance. No payment will be created.</p>
      <div className="wallet-actions">
        <button type="button" autoFocus disabled={props.busy} onClick={close}>Keep wallet</button>
        <button type="button" className="wallet-danger" disabled={props.busy} onClick={() => void confirm()}>{props.busy ? "Removing…" : "Confirm removal"}</button>
      </div>
      {props.busy ? <p role="status">Blocking future charging and requesting cleanup…</p> : null}
    </dialog>
  </section>;
}

export function PaymentMethod({ token }: Readonly<{ token: string }>) {
  const [wallet, setWallet] = useState<PayPalWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    void demoApi.readPayPalWallet(token).then((result) => { if (active) setWallet(result.wallet); }, () => {
      if (active) setError("Wallet information is unavailable. Your paid workspace remains available.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  async function remove() {
    if (!wallet || wallet.state !== "ready" || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await demoApi.removePayPalWallet(wallet.methodId, token);
      if (!result.wallet) throw new Error("missing_wallet");
      setWallet(result.wallet);
    } catch {
      setError("Removal could not be confirmed. Refresh to check its state before taking further action. Your paid workspace remains available.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  return <PaymentMethodView wallet={wallet} loading={loading} busy={busy} error={error} onConfirm={remove} />;
}
