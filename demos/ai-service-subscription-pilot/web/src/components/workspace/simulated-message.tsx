import type { GenerateAnswerOutcome } from "../../../../shared/src/usage.js";

export function SimulatedMessage(props: Readonly<{
  outcome: Extract<GenerateAnswerOutcome, { state: "committed" }>;
}>) {
  return (
    <article className="simulated-message reading-surface">
      <p className="simulated-label">{props.outcome.answer.label}</p>
      <h2>{props.outcome.answer.title}</h2>
      <ul>{props.outcome.answer.body.map((line) => <li key={line}>{line}</li>)}</ul>
    </article>
  );
}
