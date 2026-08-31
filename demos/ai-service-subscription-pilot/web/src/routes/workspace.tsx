import { useEffect, useState } from "react";

import type {
  AccountUsageSummary,
  GenerateAnswerOutcome,
  PromptKey,
} from "../../../shared/src/usage.js";
import { ActionConfirmation } from "../components/workspace/action-confirmation.js";
import {
  AllowanceCard,
  MobileAllowanceStrip,
} from "../components/workspace/allowance-card.js";
import { CompletionStatus } from "../components/workspace/completion-status.js";
import { GenerateAnswerPrompts } from "../components/workspace/generate-answer.js";
import { SimulatedMessage } from "../components/workspace/simulated-message.js";
import { ApiRequestError, demoApi } from "../lib/api.js";
import { currentAccessToken } from "../lib/supabase.js";

const returnedAnswers: Record<PromptKey, Extract<GenerateAnswerOutcome, { state: "committed" }>["answer"]> = {
  "renewal-recovery": { label: "Simulated AI", title: "Renewal recovery playbook", body: [
    "Prevent avoidable failures with timely payment-method reminders.",
    "Recover with clear context and a simple way to use another payment method.",
    "Reconcile provider evidence before restoring service access.",
  ] },
  "usage-credits": { label: "Simulated AI", title: "How AI credits work", body: [
    "Each eligible action has a visible fixed credit cost.",
    "The service reserves credits before work and commits them only after success.",
    "Failed simulated work releases the reservation automatically.",
  ] },
  "subscription-upgrade": { label: "Simulated AI", title: "Subscription upgrade response", body: [
    "Your current plan remains active until you confirm the reviewed upgrade.",
    "The review shows the exact immediate charge and allowance change.",
    "Nothing changes until the payment and entitlement update are verified.",
  ] },
};

export function WorkspaceView(props: Readonly<{
  summary: AccountUsageSummary;
  selectedPrompt: PromptKey | null;
  outcome: GenerateAnswerOutcome | null;
  busy: boolean;
  error: string | null;
  onSelectPrompt: (prompt: PromptKey) => void;
  onChooseAnother: () => void;
  onGenerate: () => void;
}>) {
  return (
    <main className="workspace-main">
      <MobileAllowanceStrip summary={props.summary} operationState={props.outcome?.state ?? null} />
      <section className="workspace-conversation glass-surface" aria-labelledby="workspace-heading">
        <p className="eyebrow">Simulated AI workspace</p>
        <div className="service-marker" role="separator" aria-label="Generate Answer service">
          <h1 id="workspace-heading">#Generate Answer</h1>
        </div>
        <p className="section-copy">Choose one curated fixture prompt. Selection is free; the server reserves exactly 10 units only after confirmation.</p>
        <GenerateAnswerPrompts
          selected={props.selectedPrompt}
          disabled={props.busy}
          onSelect={props.onSelectPrompt}
        />
        {props.selectedPrompt ? (
          <ActionConfirmation
            available={props.outcome?.state === "reserved"
              ? props.outcome.summary.allowance.available + props.outcome.summary.allowance.reserved
              : props.summary.allowance.available}
            busy={props.busy}
            onConfirm={props.onGenerate}
            onChooseAnother={props.onChooseAnother}
          />
        ) : null}
        {props.outcome?.state === "reserved" ? (
          <p className="processing-marker" role="status">Drafting answer…</p>
        ) : null}
        {props.outcome?.state === "committed" ? (
          <><SimulatedMessage outcome={props.outcome} /><CompletionStatus /></>
        ) : null}
        {props.error ? <p className="error-note" role="alert">{props.error}</p> : null}
      </section>
      <AllowanceCard summary={props.summary} />
    </main>
  );
}

export function WorkspaceRoute() {
  const [summary, setSummary] = useState<AccountUsageSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptKey | null>(null);
  const [outcome, setOutcome] = useState<GenerateAnswerOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const accessToken = await currentAccessToken();
        if (!accessToken) throw new Error("authentication_required");
        let next: AccountUsageSummary;
        try {
          next = await demoApi.readUsageSummary(accessToken);
        } catch (readError) {
          if (!(readError instanceof ApiRequestError) || readError.status !== 404) throw readError;
          next = await demoApi.activateGo(accessToken);
        }
        if (!active) return;
        setToken(accessToken);
        setSummary(next);
        const lastCommitted = next.operations.find((operation) => operation.state === "committed");
        if (lastCommitted) {
          setOutcome({
            state: "committed",
            summary: next,
            answer: returnedAnswers[lastCommitted.fixtureKey],
          });
        }
      } catch {
        if (active) setError("Sign in and complete a verified Go payment before opening the workspace.");
      }
    })();
    return () => { active = false; };
  }, []);

  if (!summary) {
    return <main className="route-status" aria-busy={!error}>{error ? <p role="alert">{error}</p> : <p>Restoring your Go workspace…</p>}</main>;
  }

  async function generate() {
    if (!token || !selectedPrompt || busy) return;
    setBusy(true);
    setError(null);
    const clientOperationId = crypto.randomUUID();
    try {
      const pendingResult = demoApi.generateAnswer({
        clientOperationId,
        promptKey: selectedPrompt,
        confirmed: true,
      }, token);
      let settled = false;
      void pendingResult.then(
        () => { settled = true; },
        () => { settled = true; },
      );
      for (let attempt = 0; attempt < 80 && !settled; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 125));
        try {
          const reservedSummary = await demoApi.readUsageSummary(token);
          const reservedOperation = reservedSummary.operations.find(
            (operation) => operation.clientOperationId === clientOperationId,
          );
          if (reservedOperation?.state === "reserved") {
            setSummary(reservedSummary);
            setOutcome({ state: "reserved", summary: reservedSummary });
            break;
          }
        } catch { /* The terminal response remains authoritative. */ }
      }
      const result = await pendingResult;
      setOutcome(result);
      setSummary(result.summary);
      if (result.state === "reserved") {
        setError("This operation is already processing. Return shortly to see its terminal state.");
      } else if (result.state === "released") {
        setError("The simulated answer failed. Your reservation was released.");
      }
    } catch {
      setError("The answer could not be generated. No unverified result is shown.");
      try {
        const latest = await demoApi.readUsageSummary(token);
        setSummary(latest);
      } catch { /* Preserve the last authoritative summary. */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceView
      summary={summary}
      selectedPrompt={selectedPrompt}
      outcome={outcome}
      busy={busy}
      error={error}
      onSelectPrompt={setSelectedPrompt}
      onChooseAnother={() => { setSelectedPrompt(null); setOutcome(null); setError(null); }}
      onGenerate={() => void generate()}
    />
  );
}
