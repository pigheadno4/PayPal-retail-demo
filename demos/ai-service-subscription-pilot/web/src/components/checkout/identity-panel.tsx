import { useState, type FormEvent } from "react";

type IdentityPanelProps = Readonly<{
  busy: boolean;
  requested?: boolean;
  error?: string;
  onRequestOtp: (email: string) => void;
  onVerifyOtp: (otp: string) => void;
}>;

export function IdentityPanel(props: IdentityPanelProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  function requestCode(event: FormEvent) {
    event.preventDefault();
    props.onRequestOtp(email);
  }

  function verifyCode(event: FormEvent) {
    event.preventDefault();
    props.onVerifyOtp(otp);
  }

  return (
    <section className="identity-card reading-surface" aria-labelledby="identity-heading">
      <p className="eyebrow">Customer story · step 2</p>
      <h1 id="identity-heading">Keep your Go selection</h1>
      <p className="section-copy">Verify one Supabase identity before a price review is created.</p>

      {!props.requested ? (
        <form className="identity-form" onSubmit={requestCode}>
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button className="primary-button" type="submit" disabled={props.busy}>
            {props.busy ? "Requesting…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form className="identity-form" onSubmit={verifyCode}>
          <p className="status-note" role="status">
            Code requested.
          </p>
          <label>
            Verification code
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={props.busy}>
            {props.busy ? "Verifying…" : "Verify and review"}
          </button>
        </form>
      )}
      {props.error ? <p className="error-note" role="alert">{props.error}</p> : null}
    </section>
  );
}
