import { z } from "zod";

const record = z.object({
  task: z.literal("TASK-0009"),
  proofLevel: z.literal("local_synthetic"),
  outcome: z.literal("fixture_contract_passed"),
  candidate: z.string().regex(/^[a-f0-9]{64}$/),
  coverage: z.tuple([z.literal("review"), z.literal("funding_handoff"), z.literal("usage_return")]),
  gaps: z.tuple([
    z.literal("hosted_provider_unverified"), z.literal("delayed_webhook_unverified"),
    z.literal("EVID-0006_partial"), z.literal("resend_failure_skipped_not_passed"),
  ]),
}).strict();

/** Reject rather than attempt to redact arbitrary private/provider payloads. */
export function sanitizeTask0009Record(input: unknown): z.infer<typeof record> {
  const parsed = record.safeParse(input);
  if (!parsed.success) throw new Error("invalid_task0009_evidence");
  return parsed.data;
}
