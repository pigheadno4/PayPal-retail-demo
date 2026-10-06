import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AccountUsageSummary, GenerateAnswerOutcome } from "../../../shared/src/usage.js";
import { WorkspaceView, workspaceRestorationError, restoreWorkspace } from "./workspace.js";
import { demoApi } from "../lib/api.js";
import { ApiRequestError } from "../lib/api.js";

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
it("requires owned expired proof before rendering recovery and never activates it for free",async()=>{
 const entry={state:"expired",arrangementId:"00000000-0000-4000-8000-000000000011",paidThrough:"2026-09-01T00:00:00Z",timeZone:"America/Los_Angeles",wallet:{label:"Saved PayPal wallet",eligible:true},canReview:true,blocker:"none"} as const;
 const api={...demoApi,readUsageSummary:async()=>{throw new ApiRequestError(404,"not_found");},readReactivation:async()=>entry,activateGo:async()=>{throw new Error("expired_free_activation");}};
 expect(await restoreWorkspace("synthetic",api)).toEqual(entry);
});

describe("workspace restoration errors", () => {
  it.each([
    [new ApiRequestError(401, "authentication_required"), "Sign in to open your workspace."],
    [new ApiRequestError(404, "not_found"), "Your workspace usage could not be found after restoring access."],
    [new ApiRequestError(409, "usage_not_available"), "Your workspace access cannot currently be restored."],
    [new ApiRequestError(500, "internal_error"), "Your workspace could not load. Please try again later."],
    [new ApiRequestError(409, "alice@example.test fixture-secret"), "Your workspace could not load. Please try again later."],
    [new ApiRequestError(404, "unknown_code"), "Your workspace could not load. Please try again later."],
    [new ApiRequestError(418, "not_found"), "Your workspace could not load. Please try again later."],
    [new Error("alice@example.test fixture-secret"), "Your workspace could not load. Please try again later."],
    [new TypeError("Failed to fetch fixture-secret"), "Your workspace could not load. Please try again later."],
    [null, "Your workspace could not load. Please try again later."],
  ])("maps %s to safe restoration copy", (error, expected) => {
    const copy = workspaceRestorationError(error);
    expect(copy).toBe(expected);
    expect(copy).not.toMatch(/fixture-secret|alice@|unknown_code|pay(?:ment)?|verified/i);
  });
});

describe("WorkspaceView", () => {
  it("places independent payment management beside paid workspace content", () => {
    const html = renderToStaticMarkup(<WorkspaceView {...props} paymentMethod={<section>Payment method fixture</section>} />);
    expect(html).toContain("Payment method fixture");
    expect(html).toContain("100 units available");
    expect(html).toContain("#Generate Answer");
  });
  it("shows the approved Go prompts without changing the 100-unit allowance", () => {
    const html = renderToStaticMarkup(<WorkspaceView {...props} />);
    expect(html).toContain("mobile-allowance-strip");
    expect(html).toContain("Go · 100 units left");
    expect(html).toContain("View usage");
    expect(html).toContain('role="separator"');
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
    expect(html).toContain("90 available · 10 reserved");
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
    expect(success).toContain("Go · 90 units left");
    expect(success).toContain("90 units available");
    expect(released).toContain("reservation was released");
    expect(released).toContain("Reservation released · 100 units available");
    expect(released).toContain("100 units available");
    expect(released).not.toContain("Renewal recovery playbook");
  });
});
