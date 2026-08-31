import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AccountUsageSummary, GenerateAnswerOutcome } from "../../../shared/src/usage.js";
import { WorkspaceView } from "./workspace.js";

const summary = (reserved = 0, committed = 0): AccountUsageSummary => ({
  tier: "go",
  allowance: { granted: 100, reserved, committed, available: 100 - reserved - committed },
  resetsAt: "2026-09-30T00:00:00.000Z",
  operations: [],
});

const props = {
  summary: summary(), selectedPrompt: null, outcome: null, busy: false, error: null,
  onSelectPrompt: vi.fn(), onChooseAnother: vi.fn(), onGenerate: vi.fn(),
};

describe("WorkspaceView", () => {
  it("shows the approved Go prompts without changing the 100-unit allowance", () => {
    const html = renderToStaticMarkup(<WorkspaceView {...props} />);
    expect(html).toContain("#Generate Answer");
    expect(html).toContain("How can an AI SaaS reduce failed-renewal churn?");
    expect(html).toContain("Explain usage-based AI credits to a new customer.");
    expect(html).toContain("Draft a concise response to a subscription-upgrade question.");
    expect(html).toContain("100 units available");
  });

  it("shows exact confirmation, projected 90, and disables conflicts while processing", () => {
    const html = renderToStaticMarkup(<WorkspaceView
      {...props}
      selectedPrompt="renewal-recovery"
      summary={summary(10, 0)}
      busy
      outcome={{ state: "reserved", summary: summary(10, 0) }}
    />);
    expect(html).toContain("Generate · 10 units");
    expect(html).toContain("90 units after success");
    expect(html).toContain("Drafting answer…");
    expect(html).toContain("disabled");
  });

  it("labels committed fixtures and represents a released failure without an answer", () => {
    const committed: GenerateAnswerOutcome = {
      state: "committed",
      answer: { label: "Simulated AI", title: "Renewal recovery playbook", body: ["Fixture result"] },
      summary: summary(0, 10),
    };
    const success = renderToStaticMarkup(<WorkspaceView {...props} summary={committed.summary} outcome={committed} />);
    const released = renderToStaticMarkup(<WorkspaceView
      {...props}
      summary={summary()}
      outcome={{ state: "released", summary: summary() }}
      error="The simulated answer failed. Your reservation was released."
    />);
    expect(success).toContain("Simulated AI");
    expect(success).toContain("Renewal recovery playbook");
    expect(success).toContain("90 units available");
    expect(released).toContain("reservation was released");
    expect(released).toContain("100 units available");
    expect(released).not.toContain("Renewal recovery playbook");
  });
});
