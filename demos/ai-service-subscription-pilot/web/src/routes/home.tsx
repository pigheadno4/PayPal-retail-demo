import { useState } from "react";
import { useNavigate } from "react-router";

import { demoApi } from "../lib/api.js";

export function HomeRoute() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function chooseGo() {
    setBusy(true);
    setError(false);
    try {
      const selection = await demoApi.createIntent();
      navigate(`/checkout/${selection.intentId}`);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="home-main">
      <section className="home-copy reading-surface">
        <p className="eyebrow">AI service subscription demo</p>
        <h1>Create with a plan shaped around your work.</h1>
        <p className="lede">Start with one bounded Go Monthly story and see every amount before the payment task begins.</p>
      </section>
      <section className="plan-card reading-surface" aria-labelledby="go-plan-heading">
        <div className="plan-heading"><span className="status-pill">Selected story</span><span>Monthly</span></div>
        <h2 id="go-plan-heading">Go</h2>
        <p className="plan-price"><strong>$10</strong><span>/ month</span></p>
        <p className="promotion">50% off your first month</p>
        <ul>
          <li><strong>100 units</strong> each monthly window</li>
          <li>Generate Answer service</li>
          <li>Persistent or 24-hour demo identity</li>
          <li>Exact Seattle tax review</li>
        </ul>
        <button className="primary-button" type="button" onClick={chooseGo} disabled={busy}>
          {busy ? "Creating selection…" : "Choose Go Monthly"}
        </button>
        {error ? <p className="error-note" role="alert">Selection is unavailable. Please try again.</p> : null}
      </section>
    </main>
  );
}
