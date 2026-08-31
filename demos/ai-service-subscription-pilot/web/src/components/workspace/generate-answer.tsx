import type { PromptKey } from "../../../../shared/src/usage.js";

export const promptChoices: ReadonlyArray<Readonly<{ key: PromptKey; copy: string }>> = [
  { key: "renewal-recovery", copy: "How can an AI SaaS reduce failed-renewal churn?" },
  { key: "usage-credits", copy: "Explain usage-based AI credits to a new customer." },
  { key: "subscription-upgrade", copy: "Draft a concise response to a subscription-upgrade question." },
];

export function GenerateAnswerPrompts(props: Readonly<{
  selected: PromptKey | null;
  disabled: boolean;
  onSelect: (prompt: PromptKey) => void;
}>) {
  return (
    <div className="prompt-grid" aria-label="Curated prompts">
      {promptChoices.map((prompt) => (
        <button
          className={props.selected === prompt.key ? "prompt-card selected" : "prompt-card"}
          type="button"
          key={prompt.key}
          disabled={props.disabled}
          onClick={() => props.onSelect(prompt.key)}
        >
          {prompt.copy}
        </button>
      ))}
    </div>
  );
}
