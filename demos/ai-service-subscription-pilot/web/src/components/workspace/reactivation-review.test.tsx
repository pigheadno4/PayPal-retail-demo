import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ReactivationView } from "./reactivation-review.js";
const entry={state:"expired",arrangementId:"00000000-0000-4000-8000-000000000011",paidThrough:"2026-09-01T00:00:00Z",timeZone:"America/Los_Angeles",wallet:{label:"Saved PayPal wallet",eligible:true},canReview:true,blocker:"none"} as const;
it("opens an owned expired account with no amount or payment confirmation before review",()=>{
 const html=renderToStaticMarkup(<ReactivationView entry={entry} review={null} outcome={null} busy={false} ready={false} error={null} onReview={()=>{}} onConfirm={()=>{}} />);
 expect(html).toContain("Restore your Go");expect(html).toContain("Review recovery payment");expect(html).not.toContain("Confirm $");
});
it.each(["pending","action_required","failed"] as const)("keeps %s non-funded with no retry control",state=>{
 const html=renderToStaticMarkup(<ReactivationView entry={entry} review={null} outcome={{operationId:entry.arrangementId,state}} busy={false} ready={false} error={null} onReview={()=>{}} onConfirm={()=>{}} />);
 expect(html).toContain("No new");expect(html).not.toContain("Review recovery payment");expect(html).not.toContain("Try again");
});
