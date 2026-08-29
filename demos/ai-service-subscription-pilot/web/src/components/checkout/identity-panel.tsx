import { useState, type FormEvent } from "react";

export type IdentityRoute = "persistent" | "temporary";

type IdentityPanelProps = Readonly<{
  route: IdentityRoute;
  busy: boolean;
  requested?: boolean;
  temporaryEmail?: string;
  error?: string;
  onRoute: (route: IdentityRoute) => void;
  onRequestOtp: (email: string) => void;
  onVerifyOtp: (otp: string) => void;
  onRevealDemoOtp: () => void;
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

      <fieldset className="identity-choice">
        <legend>Choose how to continue</legend>
        <label className={props.route === "persistent" ? "choice-card selected" : "choice-card"}>
          <input
            type="radio"
            name="identity-route"
            checked={props.route === "persistent"}
            onChange={() => props.onRoute("persistent")}
          />
          <span><strong>Use my email</strong><small>Keep this account for return visits.</small></span>
        </label>
        <label className={props.route === "temporary" ? "choice-card selected" : "choice-card"}>
          <input
            type="radio"
            name="identity-route"
            checked={props.route === "temporary"}
            onChange={() => props.onRoute("temporary")}
          />
          <span><strong>24-hour demo address</strong><small>Code access stays in this browser only.</small></span>
        </label>
      </fieldset>

      {!props.requested ? (
        <form className="identity-form" onSubmit={requestCode}>
          {props.route === "persistent" ? (
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
          ) : (
            <p className="evidence-note">The server will issue a high-entropy <code>.test</code> alias bound to this browser.</p>
          )}
          <button className="primary-button" type="submit" disabled={props.busy}>
            {props.busy ? "Requesting…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form className="identity-form" onSubmit={verifyCode}>
          <p className="status-note" role="status">
            Code requested{props.temporaryEmail ? ` for ${props.temporaryEmail}` : ""}.
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
          {props.route === "temporary" ? (
            <button className="secondary-button" type="button" onClick={props.onRevealDemoOtp} disabled={props.busy}>
              Retrieve this browser’s demo code
            </button>
          ) : null}
          <button className="primary-button" type="submit" disabled={props.busy}>
            {props.busy ? "Verifying…" : "Verify and review"}
          </button>
        </form>
      )}
      {props.error ? <p className="error-note" role="alert">{props.error}</p> : null}
    </section>
  );
}
