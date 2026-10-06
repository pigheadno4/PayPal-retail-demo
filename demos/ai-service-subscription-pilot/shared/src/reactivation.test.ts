import { expect, it } from "vitest";
import { reactivationConfirmRequestSchema, reactivationOutcomeSchema } from "./reactivation.js";
it("rejects browser supplied token, money and unconfirmed recovery", () => {
  const valid = {arrangementId:"00000000-0000-4000-8000-000000000011",quoteId:"00000000-0000-4000-8000-000000000012",confirmed:true,clientMetadataId:"a".repeat(32)};
  expect(reactivationConfirmRequestSchema.safeParse(valid).success).toBe(true);
  for (const extra of [{token:"not_allowed"},{amount:1},{confirmed:false},{clientMetadataId:"short"}]) expect(reactivationConfirmRequestSchema.safeParse({...valid,...extra}).success).toBe(false);
});
it("does not describe funding without a verified term", () => {
  expect(reactivationOutcomeSchema.safeParse({operationId:"00000000-0000-4000-8000-000000000011",state:"confirmed"}).success).toBe(false);
});
