import { useEffect, useState } from "react";
import { useParams } from "react-router";

import type { CheckoutReview } from "../../../shared/src/checkout.js";
import { IdentityPanel, type IdentityRoute } from "../components/checkout/identity-panel.js";
import { QuoteReview } from "../components/checkout/quote-review.js";
import { ApiRequestError, demoApi } from "../lib/api.js";
import { currentAccessToken, verifyEmailOtp } from "../lib/supabase.js";

type CheckoutState =
  | Readonly<{ phase: "loading" }>
  | Readonly<{
      phase: "identity";
      route: IdentityRoute;
      busy: boolean;
      requested?: boolean;
      email?: string;
      temporaryEmail?: string;
      error?: string;
    }>
  | Readonly<{ phase: "review"; review: CheckoutReview; stale: boolean; busy: boolean; error?: string }>;

type CheckoutRouteViewProps = Readonly<{
  state: CheckoutState;
  onIdentityRoute: (route: IdentityRoute) => void;
  onRequestOtp: (email: string) => void;
  onVerifyOtp: (otp: string) => void;
  onRevealDemoOtp: () => void;
  onReplaceQuote: () => void;
}>;

async function restoreCheckout(intentId: string): Promise<Readonly<{
  state: CheckoutState;
  accessToken: string | null;
}>> {
  try {
    const token = await currentAccessToken();
    if (!token) {
      return { state: { phase: "identity", route: "persistent", busy: false }, accessToken: null };
    }
    const review = await demoApi.readQuote(intentId, token);
    return {
      state: {
        phase: "review",
        review,
        stale: Date.parse(review.expiresAt) <= Date.now(),
        busy: false,
      },
      accessToken: token,
    };
  } catch (error) {
    const expectedIdentityState = error instanceof ApiRequestError
      && (error.status === 401 || error.status === 404);
    return {
      state: {
        phase: "identity",
        route: "persistent",
        busy: false,
        ...(expectedIdentityState ? {} : { error: "Identity service is unavailable." }),
      },
      accessToken: null,
    };
  }
}

export function CheckoutRouteView(props: CheckoutRouteViewProps) {
  if (props.state.phase === "loading") {
    return <main className="route-status" aria-busy="true"><p>Restoring your Go selection…</p></main>;
  }
  if (props.state.phase === "identity") {
    return (
      <main className="checkout-main">
        <IdentityPanel
          route={props.state.route}
          busy={props.state.busy}
          requested={props.state.requested}
          temporaryEmail={props.state.temporaryEmail}
          error={props.state.error}
          onRoute={props.onIdentityRoute}
          onRequestOtp={props.onRequestOtp}
          onVerifyOtp={props.onVerifyOtp}
          onRevealDemoOtp={props.onRevealDemoOtp}
        />
        <aside className="selection-summary glass-surface">
          <p className="eyebrow">Your selection</p><h2>Go Monthly</h2>
          <p><strong>$10.00</strong> base · 50% first-month promotion</p>
          <p>100 included units · exact total follows identity</p>
        </aside>
      </main>
    );
  }
  return (
    <main>
      <QuoteReview
        review={props.state.review}
        stale={props.state.stale}
        busy={props.state.busy}
        onReplace={props.onReplaceQuote}
      />
      {props.state.error ? <p className="error-note" role="alert">{props.state.error}</p> : null}
    </main>
  );
}

export function CheckoutRoute() {
  const { intentId = "" } = useParams();
  const [state, setState] = useState<CheckoutState>({ phase: "loading" });
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void restoreCheckout(intentId).then((restored) => {
      if (!active) return;
      setState(restored.state);
      setAccessToken(restored.accessToken);
    });
    return () => { active = false; };
  }, [intentId]);

  function selectIdentityRoute(route: IdentityRoute) {
    setState({ phase: "identity", route, busy: false });
  }

  async function requestOtp(email: string) {
    if (state.phase !== "identity") return;
    const route = state.route;
    setState({ ...state, busy: true, error: undefined });
    try {
      let temporaryEmail: string | undefined;
      if (route === "temporary") {
        temporaryEmail = (await demoApi.createDemoSession()).email;
      }
      await demoApi.requestOtp(route === "persistent"
        ? { intentId, identityRoute: route, email }
        : { intentId, identityRoute: route });
      setState({
        phase: "identity",
        route,
        busy: false,
        requested: true,
        email: route === "persistent" ? email : temporaryEmail,
        temporaryEmail,
      });
    } catch {
      setState({ phase: "identity", route, busy: false, error: "The code could not be requested." });
    }
  }

  async function revealDemoOtp() {
    if (state.phase !== "identity") return;
    setState({ ...state, busy: true, error: undefined });
    try {
      const result = await demoApi.retrieveDemoOtp();
      await verifyOtp(result.otp);
    } catch {
      setState({ ...state, busy: false, error: "The demo code is not ready yet. Try again shortly." });
    }
  }

  async function verifyOtp(otp: string) {
    if (state.phase !== "identity" || !state.email) return;
    const previous = state;
    setState({ ...state, busy: true, error: undefined });
    try {
      const token = await verifyEmailOtp(state.email, otp);
      setAccessToken(token);
      const review = await demoApi.resume(intentId, token);
      setState({
        phase: "review",
        review,
        stale: Date.parse(review.expiresAt) <= Date.now(),
        busy: false,
      });
    } catch {
      setState({ ...previous, busy: false, error: "That code could not be verified." });
    }
  }

  async function replaceQuote() {
    if (state.phase !== "review" || !accessToken) return;
    const previous = state;
    setState({ ...state, busy: true, error: undefined });
    try {
      const result = await demoApi.replaceQuote(intentId, state.review.quoteId, accessToken);
      setState({
        phase: "review",
        review: result.review,
        stale: Date.parse(result.review.expiresAt) <= Date.now(),
        busy: false,
      });
    } catch {
      setState({ ...previous, busy: false, error: "The review could not be refreshed." });
    }
  }

  return (
    <CheckoutRouteView
      state={state}
      onIdentityRoute={selectIdentityRoute}
      onRequestOtp={(email) => void requestOtp(email)}
      onVerifyOtp={(otp) => void verifyOtp(otp)}
      onRevealDemoOtp={() => void revealDemoOtp()}
      onReplaceQuote={() => void replaceQuote()}
    />
  );
}
