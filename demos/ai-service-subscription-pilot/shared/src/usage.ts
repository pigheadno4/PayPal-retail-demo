import { z } from "zod";

export const promptKeySchema = z.enum([
  "renewal-recovery",
  "usage-credits",
  "subscription-upgrade",
]);

export const allowanceTotalsSchema = z.object({
  granted: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  committed: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
}).strict();

export const usageOperationSchema = z.object({
  clientOperationId: z.uuid(),
  allowanceWindowId: z.uuid(),
  action: z.literal("generate-answer"),
  fixtureKey: promptKeySchema,
  units: z.literal(10),
  state: z.enum(["reserved", "committed", "released"]),
  fundingSource: z.literal("PayPal Wallet"),
  reservedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
}).strict();

export const accountUsageSummarySchema = z.object({
  tier: z.literal("go"),
  allowance: allowanceTotalsSchema,
  resetsAt: z.iso.datetime(),
  operations: z.array(usageOperationSchema),
}).strict();

export const activateGoResponseSchema = accountUsageSummarySchema;

export const generateAnswerRequestSchema = z.object({
  clientOperationId: z.uuid(),
  promptKey: promptKeySchema,
  confirmed: z.literal(true),
}).strict();

const simulatedAnswerSchema = z.object({
  label: z.literal("Simulated AI"),
  title: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
}).strict();

const outcomeBase = z.object({ summary: accountUsageSummarySchema }).strict();

export const generateAnswerOutcomeSchema = z.discriminatedUnion("state", [
  outcomeBase.extend({ state: z.literal("reserved") }).strict(),
  outcomeBase.extend({ state: z.literal("released") }).strict(),
  outcomeBase.extend({
    state: z.literal("committed"),
    answer: simulatedAnswerSchema,
  }).strict(),
]);

export type PromptKey = Readonly<z.infer<typeof promptKeySchema>>;
export type AccountUsageSummary = Readonly<z.infer<typeof accountUsageSummarySchema>>;
export type ActivateGoResponse = AccountUsageSummary;
export type GenerateAnswerRequest = Readonly<z.infer<typeof generateAnswerRequestSchema>>;
export type GenerateAnswerOutcome = Readonly<z.infer<typeof generateAnswerOutcomeSchema>>;
