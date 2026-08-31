import type {
  AccountUsageSummary,
  GenerateAnswerOutcome,
} from "../../../../shared/src/usage.js";

type OperationState = GenerateAnswerOutcome["state"] | null;

function mobileAllowanceLabel(summary: AccountUsageSummary, state: OperationState) {
  if (state === "reserved") {
    return `${summary.allowance.available} available · ${summary.allowance.reserved} reserved`;
  }
  if (state === "released") {
    return `Reservation released · ${summary.allowance.available} units available`;
  }
  return `Go · ${summary.allowance.available} units left`;
}

function operationLabel(state: OperationState) {
  if (state === "reserved") return "Processing";
  if (state === "committed") return "Committed";
  if (state === "released") return "Released";
  return "Ready";
}

export function MobileAllowanceStrip({
  summary,
  operationState,
}: Readonly<{
  summary: AccountUsageSummary;
  operationState: OperationState;
}>) {
  const { allowance } = summary;
  return (
    <section className="mobile-allowance-strip reading-surface" aria-label="Go allowance summary">
      <strong className="mobile-allowance-value" role="status" aria-live="polite" aria-atomic="true">
        {mobileAllowanceLabel(summary, operationState)}
      </strong>
      <details className="mobile-usage-disclosure">
        <summary>View usage</summary>
        <div className="mobile-usage-detail">
          <h2>Go usage</h2>
          <dl>
            <div><dt>Included balance</dt><dd>{allowance.available}</dd></div>
            <div><dt>Purchased credits</dt><dd>0</dd></div>
            <div><dt>Reserved</dt><dd>{allowance.reserved}</dd></div>
            <div><dt>Committed</dt><dd>{allowance.committed}</dd></div>
          </dl>
          <p><strong>Action</strong> Generate answer · 10</p>
          <p><strong>State</strong> {operationLabel(operationState)}</p>
          <p className="muted">Resets {new Date(summary.resetsAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
        </div>
      </details>
    </section>
  );
}

export function AllowanceCard({ summary }: Readonly<{ summary: AccountUsageSummary }>) {
  const { allowance } = summary;
  return (
    <aside className="allowance-card reading-surface" aria-label="Go allowance">
      <p className="eyebrow">Go Monthly allowance</p>
      <strong className="allowance-value">{allowance.available} units available</strong>
      <progress max={allowance.granted} value={allowance.available} aria-label={`${allowance.available} of ${allowance.granted} units available`} />
      <dl>
        <div><dt>Granted</dt><dd>{allowance.granted}</dd></div>
        <div><dt>Reserved</dt><dd>{allowance.reserved}</dd></div>
        <div><dt>Committed</dt><dd>{allowance.committed}</dd></div>
      </dl>
      <p className="muted">Resets {new Date(summary.resetsAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
    </aside>
  );
}
