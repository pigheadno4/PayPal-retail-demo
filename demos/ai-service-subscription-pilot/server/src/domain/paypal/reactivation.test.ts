import { expect, it } from "vitest";
import { buildSavedWalletOrder } from "./payload.js";
import { HttpPayPalGateway, projectSavedWalletFundingEvidence } from "./http-gateway.js";
const review={quoteId:"quote",dueToday:{currency:"USD" as const,cents:1106},taxableSubtotal:{currency:"USD" as const,cents:1000},tax:{currency:"USD" as const,cents:106}};
it("uses only subsequent owned token fields and immutable amount/reference",()=>{
  expect(buildSavedWalletOrder(review,"synthetic-token","operation")).toMatchObject({intent:"CAPTURE",payment_source:{paypal:{vault_id:"synthetic-token",stored_credential:{payment_initiator:"CUSTOMER",usage:"SUBSEQUENT"}}},purchase_units:[{reference_id:"operation",custom_id:"operation",amount:{value:"11.06",breakdown:{item_total:{value:"10.00"},tax_total:{value:"1.06"}}}}]});
  expect(JSON.stringify(buildSavedWalletOrder(review,"synthetic-token","operation"))).not.toMatch(/store_in_vault|billing_plan|TRIAL|attributes/);
});
const raw={id:"synthetic-order",status:"COMPLETED",purchase_units:[{reference_id:"operation",custom_id:"operation",payee:{merchant_id:"synthetic-merchant"},payments:{captures:[{id:"synthetic-capture",status:"COMPLETED",amount:{currency_code:"USD",value:"11.06"},create_time:"2026-10-06T12:00:00Z"}]}}]};
it("accepts saved-token completion without vault-created evidence",()=>{
  expect(projectSavedWalletFundingEvidence(raw,"synthetic-order","operation")).toMatchObject({captureId:"synthetic-capture",capturedAt:"2026-10-06T12:00:00.000Z",amount:{currency:"USD",cents:1106},payeeMerchantId:"synthetic-merchant"});
});
it("rejects uncorrelated, ambiguous and lifecycle-uncertain completion",()=>{
  for(const bad of [{...raw,id:"other"},{...raw,status:"PAYER_ACTION_REQUIRED"},{...raw,purchase_units:[raw.purchase_units[0],raw.purchase_units[0]]},{...raw,purchase_units:[{...raw.purchase_units[0],custom_id:"other"}]}])expect(()=>projectSavedWalletFundingEvidence(bad,"synthetic-order","operation")).toThrow();
});
it("retains create representation and retrieves only the persisted same order",async()=>{
  const calls:{url:string;init:RequestInit}[]=[];
  const gateway=new HttpPayPalGateway({clientId:"synthetic",clientSecret:"synthetic",environment:"sandbox",fetch:async(input,init)=>{calls.push({url:String(input),init:init??{}});return new Response(JSON.stringify(String(input).endsWith("/token")?{access_token:"synthetic"}:raw),{status:200});}});
  expect(await gateway.createSavedWalletOrder({payload:buildSavedWalletOrder(review,"synthetic-token","operation"),requestId:"synthetic-key",clientMetadataId:"a".repeat(32)})).toEqual(raw);
  expect(await gateway.readSavedWalletOrder("synthetic-order")).toEqual(raw);
  expect(calls.map(c=>c.init.method)).toEqual(["POST","POST","POST","GET"]);
  expect(calls[1]!.init.headers).toMatchObject({"PayPal-Request-Id":"synthetic-key","PayPal-Client-Metadata-Id":"a".repeat(32),Prefer:"return=representation"});
  expect(calls[3]!.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/synthetic-order");
});
