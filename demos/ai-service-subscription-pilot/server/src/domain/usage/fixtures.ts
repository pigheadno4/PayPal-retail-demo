import type { GenerateAnswerOutcome, PromptKey } from "../../../../shared/src/usage.js";

export type SimulatedAnswer = Extract<GenerateAnswerOutcome, { state: "committed" }>["answer"];

const answers: Record<PromptKey, SimulatedAnswer> = {
  "renewal-recovery": {
    label: "Simulated AI",
    title: "Renewal recovery playbook",
    body: [
      "Prevent avoidable failures with timely payment-method reminders.",
      "Recover with clear context and a simple way to use another payment method.",
      "Reconcile provider evidence before restoring service access.",
    ],
  },
  "usage-credits": {
    label: "Simulated AI",
    title: "How AI credits work",
    body: [
      "Each eligible action has a visible fixed credit cost.",
      "The service reserves credits before work and commits them only after success.",
      "Failed simulated work releases the reservation automatically.",
    ],
  },
  "subscription-upgrade": {
    label: "Simulated AI",
    title: "Subscription upgrade response",
    body: [
      "Your current plan remains active until you confirm the reviewed upgrade.",
      "The review shows the exact immediate charge and allowance change.",
      "Nothing changes until the payment and entitlement update are verified.",
    ],
  },
};

export function fixtureAnswer(promptKey: PromptKey): SimulatedAnswer {
  return answers[promptKey];
}

export type FixtureRunner = (promptKey: PromptKey) => Promise<SimulatedAnswer>;

export function createDeterministicFixtureRunner(
  delayMs = 4_000,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): FixtureRunner {
  return async (promptKey) => {
    await sleep(delayMs);
    return fixtureAnswer(promptKey);
  };
}
