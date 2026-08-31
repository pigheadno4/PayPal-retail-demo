import type { AccountUsageSummary } from "../../../../shared/src/usage.js";

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
