import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createDatabaseClient } from "../../db/client.js";
import { PostgresReactivationRepository } from "./repository.js";
import { ReactivationService } from "./service.js";
import { PostgresUsageRepository } from "../usage/repository.js";
import { PostgresQuoteRepository } from "../quote/repository.js";
import { PayPalDefinitiveError } from "../paypal/gateway.js";
const sql=createDatabaseClient(process.env.DATABASE_URL??"postgresql://task0011@127.0.0.1:1/task0011_test");
const owner=randomUUID();const now=new Date("2026-10-06T12:00:00Z");let arrangementId="";
async function seed(owner:string){
  const [target]=await sql`select current_database() as database,current_user as owner,current_setting('data_directory') as directory`;
  if(target.database!=="task0011_test"||target.owner!=="task0011"||!String(target.directory).startsWith("/private/tmp/task0011-postgres-"))throw new Error("task0011_owned_database_required");
  await sql`insert into auth.users(id) values(${owner})`;
  const [a]=await sql`insert into app_private.accounts(public_id,auth_user_id,identity_kind)values(${randomUUID()},${owner},'persistent')returning id`;
  const [i]=await sql`insert into app_private.checkout_intents(public_id,account_id,anonymous_session_token_hash,tier,cadence,state)values(${randomUUID()},${a.id},${Buffer.alloc(32,11)},'go','monthly','funded')returning id`;
  const [q]=await sql`insert into app_private.quotes(public_id,checkout_intent_id,currency,base_cents,promotion_cents,taxable_subtotal_cents,tax_basis_points,tax_cents,total_cents,pricing_version,tax_version,issued_at,expires_at,renews_at,allowance_resets_at,time_zone)values(${randomUUID()},${i.id},'USD',1000,-500,500,1055,53,553,'go-monthly-intro-v1','us-wa-seattle-digital-ai-q3-2026-v1','2026-08-01','2026-08-01 00:15Z','2026-09-01','2026-09-01','America/Los_Angeles')returning id`;
  const [p]=await sql`insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,create_request_id,capture_request_id,funding_status,vault_status,funding_verified_at)values(${randomUUID()},${i.id},${q.id},${a.id},'TASK0011','sandbox',${randomUUID()},${randomUUID()},'completed','vaulted','2026-08-01')returning id`;
  const [c]=await sql`insert into app_private.provider_customers(public_id,account_id,provider,merchant_id,environment,provider_customer_id)values(${randomUUID()},${a.id},'paypal','TASK0011','sandbox',${`synthetic-${randomUUID()}`})returning id`;
  const [m]=await sql`insert into app_private.payment_methods(public_id,provider_customer_id,merchant_id,environment,provider_vault_id,readiness,is_primary)values(${randomUUID()},${c.id},'TASK0011','sandbox',${`synthetic-${randomUUID()}`},'ready',true)returning id`;
  const [b]=await sql`insert into app_private.billing_arrangements(public_id,account_id,checkout_intent_id,quote_id,payment_operation_id,payment_method_id,tier,cadence,funding_status,reusable_readiness,entitlement_status,renewal_at,allowance_resets_at)values(${randomUUID()},${a.id},${i.id},${q.id},${p.id},${m.id},'go','monthly','verified','ready','active','2026-09-01','2026-09-01')returning id,public_id`;
  await sql`insert into app_private.allowance_windows(public_id,billing_arrangement_id,window_starts_at,window_ends_at,granted_units,reserved_units,committed_units)values(${randomUUID()},${b.id},'2026-08-01','2026-09-01',100,0,20)`;
  return b.public_id as string;
}
beforeAll(async()=>{arrangementId=await seed(owner);});
afterAll(()=>sql.end());
it("proves owned expired entry without changing original identity or allowance",async()=>{
  const repo=new PostgresReactivationRepository(sql,"TASK0011","sandbox");
  expect(await repo.readEntry(owner,now)).toMatchObject({state:"expired",arrangementId,canReview:true,wallet:{eligible:true}});
  const [counts]=await sql`select (select count(*) from app_private.allowance_windows w join app_private.billing_arrangements b on b.id=w.billing_arrangement_id join app_private.accounts a on a.id=b.account_id where a.auth_user_id=${owner})::int as windows`;
  expect(counts.windows).toBe(1);
});
it("conceals another owner's arrangement",async()=>{await expect(new PostgresReactivationRepository(sql,"TASK0011","sandbox").readEntry(randomUUID(),now)).rejects.toThrow("reactivation_not_found");});
it("claims one concurrent operation, funds one calendar term and preserves original history",async()=>{
  const user=randomUUID();const id=await seed(user);let creates=0;
  const original=await sql`select id,public_id,account_id,checkout_intent_id,quote_id,payment_operation_id,payment_method_id,reusable_readiness from app_private.billing_arrangements where public_id=${id}`;
  const acquisitionHistory=()=>sql`select row_to_json(i) as intent,row_to_json(q) as quote,row_to_json(p) as payment,row_to_json(m) as method,row_to_json(w) as previous_window from app_private.billing_arrangements b join app_private.checkout_intents i on i.id=b.checkout_intent_id join app_private.quotes q on q.id=b.quote_id join app_private.payment_operations p on p.id=b.payment_operation_id join app_private.payment_methods m on m.id=b.payment_method_id join app_private.allowance_windows w on w.billing_arrangement_id=b.id where b.public_id=${id} and w.funding_payment_operation_id is null`;
  const priorHistory=await acquisitionHistory();
  const repo=new PostgresReactivationRepository(sql,"TASK0011","sandbox");
  const gateway={createSavedWalletOrder:async(input:{payload:Readonly<Record<string,unknown>>})=>{creates++;const unit=(input.payload.purchase_units as {reference_id:string;custom_id:string}[])[0]!;return{id:"synthetic-funded-order",status:"COMPLETED",purchase_units:[{reference_id:unit.reference_id,custom_id:unit.custom_id,payee:{merchant_id:"TASK0011"},payments:{captures:[{id:"synthetic-funded-capture",status:"COMPLETED",amount:{currency_code:"USD",value:"11.06"},create_time:"2026-10-06T12:00:00Z"}]}}]};},readSavedWalletOrder:async()=>{throw new Error("should_not_read_completed");}};
  const service=new ReactivationService(repo,gateway,()=>now);
  const review=await service.review(user,{arrangementId:id});
  expect(review).toMatchObject({base:{cents:1000},promotion:{cents:0},dueToday:{cents:1106}});
  expect(review).toMatchObject({fraudNet:{sourceId:"AI_SERVICE_STUDIO_CHECKOUT",sandbox:true}});
  const input={arrangementId:id,quoteId:review.quoteId,confirmed:true as const,clientMetadataId:"a".repeat(32)};
  const results=await Promise.all([service.confirm(user,input),service.confirm(user,input)]);
  expect(creates).toBe(1);expect(results.map(r=>r.operationId)).toEqual([results[0]!.operationId,results[0]!.operationId]);
  expect(await service.status(user,results[0]!.operationId)).toMatchObject({state:"confirmed",term:{startsAt:"2026-10-06T12:00:00.000Z",endsAt:"2026-11-06T13:00:00.000Z",includedUnits:100}});
  expect(await sql`select id,public_id,account_id,checkout_intent_id,quote_id,payment_operation_id,payment_method_id,reusable_readiness from app_private.billing_arrangements where public_id=${id}`).toEqual(original);
  expect(await acquisitionHistory()).toEqual(priorHistory);
  const [history]=await sql`select w.committed_units,w.granted_units,(select count(*)::int from app_private.allowance_windows x where x.billing_arrangement_id=b.id)as windows from app_private.billing_arrangements b join app_private.allowance_windows w on w.billing_arrangement_id=b.id where b.public_id=${id} order by w.window_starts_at limit 1`;
  expect(history).toMatchObject({committed_units:"20",granted_units:"100",windows:2});
  const usage=new PostgresUsageRepository(sql);
  expect(await usage.activate(user,now)).toMatchObject({allowance:{granted:100,available:100},resetsAt:"2026-11-06T13:00:00.000Z"});
  const [count]=await sql`select count(*)::int as windows from app_private.allowance_windows where billing_arrangement_id=${original[0]!.id}`;expect(count.windows).toBe(2);
  expect(await new PostgresQuoteRepository(sql).findCurrentOwnedQuote(BigInt(original[0]!.account_id),review.intentId)).toBeNull();
  await sql`update app_private.payment_operations set funding_status='failed' where id=${original[0]!.payment_operation_id}`;
  expect(await usage.reserve(user,{clientOperationId:randomUUID(),promptKey:"renewal-recovery",confirmed:true},now)).toMatchObject({outcome:{state:"reserved",summary:{operations:[{fundingSource:"PayPal Wallet"}],allowance:{reserved:10,available:90}}}});
});
it("denies a method whose provider-customer belongs to a different merchant",async()=>{
 const user=randomUUID();const id=await seed(user);
 await sql`update app_private.provider_customers set merchant_id='OTHER-MERCHANT' where id in(select m.provider_customer_id from app_private.payment_methods m join app_private.billing_arrangements b on b.payment_method_id=m.id where b.public_id=${id})`;
 expect(await new PostgresReactivationRepository(sql,"TASK0011","sandbox").readEntry(user,now)).toMatchObject({canReview:false,wallet:{eligible:false}});
});
it.each(["pending","action_required"] as const)("persists %s without access, another create or unbounded reads",async(state)=>{
  const user=randomUUID();const id=await seed(user);let creates=0;let reads=0;
  const gateway={createSavedWalletOrder:async()=>{creates++;return{id:`synthetic-${user}`,status:state==="pending"?"CREATED":"PAYER_ACTION_REQUIRED"};},readSavedWalletOrder:async()=>{reads++;return{id:`synthetic-${user}`,status:"CREATED"};}};
  const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),gateway,()=>now);
  const review=await service.review(user,{arrangementId:id});const input={arrangementId:id,quoteId:review.quoteId,confirmed:true as const,clientMetadataId:"b".repeat(32)};
  const outcome=await service.confirm(user,input);expect(outcome.state).toBe(state);
  await Promise.all([service.status(user,outcome.operationId),service.status(user,outcome.operationId)]);
  await service.confirm(user,input);expect(creates).toBe(1);expect(reads).toBe(state==="pending"?1:0);
  const [counts]=await sql`select count(*)::int as windows from app_private.allowance_windows w join app_private.billing_arrangements b on b.id=w.billing_arrangement_id where b.public_id=${id}`;expect(counts.windows).toBe(1);
});
it("replaces expired immutable reviews, rejects stale confirmation and cross-owner replay",async()=>{
 const user=randomUUID();const id=await seed(user);const repo=new PostgresReactivationRepository(sql,"TASK0011","sandbox");const first=await repo.review(user,{arrangementId:id},now);
 expect(await repo.review(user,{arrangementId:id,currentQuoteId:first.quoteId},now)).toEqual(first);
 const later=new Date(now.getTime()+16*60000);const next=await repo.review(user,{arrangementId:id,currentQuoteId:first.quoteId},later);expect(next.quoteId).not.toBe(first.quoteId);
 const [old]=await sql`select total_cents,expires_at from app_private.quotes where public_id=${first.quoteId}`;expect(Number(old.total_cents)).toBe(1106);expect(new Date(old.expires_at).toISOString()).toBe("2026-10-06T12:15:00.000Z");
 await expect(repo.claim(user,{arrangementId:id,quoteId:first.quoteId,confirmed:true,clientMetadataId:"c".repeat(32)},later)).rejects.toThrow("stale_quote");
 await expect(repo.claim(randomUUID(),{arrangementId:id,quoteId:next.quoteId,confirmed:true,clientMetadataId:"c".repeat(32)},later)).rejects.toThrow("reactivation_not_found");
});
it("keeps unknown create transport pending and terminal rejection failed with no allowance",async()=>{
 for(const definitive of [false,true]){const user=randomUUID();const id=await seed(user);let creates=0;
 const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),{createSavedWalletOrder:async()=>{creates++;throw definitive?new PayPalDefinitiveError():new Error("synthetic_timeout");},readSavedWalletOrder:async()=>{throw new Error("no_known_order");}},()=>now);
 const quote=await service.review(user,{arrangementId:id});const input={arrangementId:id,quoteId:quote.quoteId,confirmed:true as const,clientMetadataId:"d".repeat(32)};const result=await service.confirm(user,input);expect(result.state).toBe(definitive?"failed":"pending");await service.status(user,result.operationId);if(!definitive)await service.confirm(user,input);expect(creates).toBe(1);
 const [count]=await sql`select count(*)::int as windows from app_private.allowance_windows w join app_private.billing_arrangements b on b.id=w.billing_arrangement_id where b.public_id=${id}`;expect(count.windows).toBe(1);}
});
it("reconciles delayed same-order evidence once without granting a present term after expiry",async()=>{
 const user=randomUUID();const id=await seed(user);let current=now;let reference="";let reads=0;
 const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),{createSavedWalletOrder:async input=>{reference=(input.payload.purchase_units as {reference_id:string}[])[0]!.reference_id;return{id:`order-${user}`,status:"CREATED"};},readSavedWalletOrder:async()=>{reads++;return{id:`order-${user}`,status:"COMPLETED",purchase_units:[{reference_id:reference,custom_id:reference,payee:{merchant_id:"TASK0011"},payments:{captures:[{id:`capture-${user}`,status:"COMPLETED",amount:{currency_code:"USD",value:"11.06"},create_time:now.toISOString()}]}}]};}},()=>current);
 const quote=await service.review(user,{arrangementId:id});const result=await service.confirm(user,{arrangementId:id,quoteId:quote.quoteId,confirmed:true,clientMetadataId:"e".repeat(32)});current=new Date("2026-11-08T12:00:00Z");
 expect(await service.status(user,result.operationId)).toMatchObject({state:"confirmed",term:{endsAt:"2026-11-06T13:00:00.000Z"}});await service.status(user,result.operationId);expect(reads).toBe(1);
 await expect(new PostgresUsageRepository(sql).activate(user,current)).rejects.toThrow("usage_not_available");
});
it("persists action-required returned by the one same-order reconciliation",async()=>{
 const user=randomUUID();const id=await seed(user);const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),{createSavedWalletOrder:async()=>({id:`order-${user}`,status:"CREATED"}),readSavedWalletOrder:async()=>({id:`order-${user}`,status:"PAYER_ACTION_REQUIRED"})},()=>now);
 const review=await service.review(user,{arrangementId:id});const result=await service.confirm(user,{arrangementId:id,quoteId:review.quoteId,confirmed:true,clientMetadataId:"f".repeat(32)});expect(await service.status(user,result.operationId)).toMatchObject({state:"action_required"});
});
it("rejects funding provenance changed between review and confirmation without creating",async()=>{
 const user=randomUUID();const id=await seed(user);let creates=0;
 const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),{createSavedWalletOrder:async()=>{creates++;return{};},readSavedWalletOrder:async()=>({})},()=>now);
 const review=await service.review(user,{arrangementId:id});
 await sql`update app_private.payment_operations set funding_status='failed' where id=(select payment_operation_id from app_private.billing_arrangements where public_id=${id})`;
 await expect(service.confirm(user,{arrangementId:id,quoteId:review.quoteId,confirmed:true,clientMetadataId:"a".repeat(32)})).rejects.toThrow("reactivation_not_available");expect(creates).toBe(0);
});
it.each(["readiness","tombstone"])("rejects %s changed between review and confirmation without creating",async(change)=>{
 const user=randomUUID();const id=await seed(user);let creates=0;const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),{createSavedWalletOrder:async()=>{creates++;return{};},readSavedWalletOrder:async()=>({})},()=>now);
 const review=await service.review(user,{arrangementId:id});
 if(change==="readiness")await sql`update app_private.payment_methods set readiness='pending' where id=(select payment_method_id from app_private.billing_arrangements where public_id=${id})`;
 else await sql`update app_private.payment_methods set removal_state='removing',removal_started_at=${now},readiness='failed',is_primary=false where id=(select payment_method_id from app_private.billing_arrangements where public_id=${id})`;
 await expect(service.confirm(user,{arrangementId:id,quoteId:review.quoteId,confirmed:true,clientMetadataId:"b".repeat(32)})).rejects.toThrow("reactivation_not_available");expect(creates).toBe(0);
});
it.each(["amount","currency","merchant","reference"])("keeps mismatched %s completion unfunded",async(mismatch)=>{
 const user=randomUUID();const id=await seed(user);const gateway={createSavedWalletOrder:async(input:{payload:Readonly<Record<string,unknown>>})=>{
  const ref=(input.payload.purchase_units as {reference_id:string}[])[0]!.reference_id;return{id:`order-${user}`,status:"COMPLETED",purchase_units:[{reference_id:ref,custom_id:mismatch==="reference"?"other":ref,payee:{merchant_id:mismatch==="merchant"?"OTHER":"TASK0011"},payments:{captures:[{id:`capture-${user}`,status:"COMPLETED",amount:{currency_code:mismatch==="currency"?"EUR":"USD",value:mismatch==="amount"?"11.05":"11.06"},create_time:now.toISOString()}]}}]};
 },readSavedWalletOrder:async()=>({})};
 const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),gateway,()=>now);const review=await service.review(user,{arrangementId:id});const result=await service.confirm(user,{arrangementId:id,quoteId:review.quoteId,confirmed:true,clientMetadataId:"c".repeat(32)});expect(result.state).toBe("pending");
 const [count]=await sql`select count(*)::int as windows from app_private.allowance_windows w join app_private.billing_arrangements b on b.id=w.billing_arrangement_id where b.public_id=${id}`;expect(count.windows).toBe(1);
});
it("retains verified funding after a removal race without reviving the saved method",async()=>{
 const user=randomUUID();const id=await seed(user);const repo=new PostgresReactivationRepository(sql,"TASK0011","sandbox");
 const service=new ReactivationService(repo,{createSavedWalletOrder:async(input)=>{
  await sql`update app_private.payment_methods set removal_state='removing',removal_started_at=${now},readiness='failed',is_primary=false where id=(select payment_method_id from app_private.billing_arrangements where public_id=${id})`;
  const ref=(input.payload.purchase_units as {reference_id:string}[])[0]!.reference_id;return{id:`order-${user}`,status:"COMPLETED",purchase_units:[{reference_id:ref,custom_id:ref,payee:{merchant_id:"TASK0011"},payments:{captures:[{id:`capture-${user}`,status:"COMPLETED",amount:{currency_code:"USD",value:"11.06"},create_time:now.toISOString()}]}}]};
 },readSavedWalletOrder:async()=>({})},()=>now);
 const review=await service.review(user,{arrangementId:id});const outcome=await service.confirm(user,{arrangementId:id,quoteId:review.quoteId,confirmed:true,clientMetadataId:"d".repeat(32)});expect(outcome.state).toBe("confirmed");
 const [state]=await sql`select b.entitlement_status,m.removal_state,m.readiness,m.is_primary from app_private.billing_arrangements b join app_private.payment_methods m on m.id=b.payment_method_id where b.public_id=${id}`;expect(state).toEqual({entitlement_status:"suspended",removal_state:"removing",readiness:"failed",is_primary:false});
});
it("does not reuse a completed capture for a second operation",async()=>{
 for(let index=0;index<2;index++){
  const user=randomUUID();const id=await seed(user);const service=new ReactivationService(new PostgresReactivationRepository(sql,"TASK0011","sandbox"),{createSavedWalletOrder:async(input)=>{
   const ref=(input.payload.purchase_units as {reference_id:string}[])[0]!.reference_id;return{id:`order-${user}`,status:"COMPLETED",purchase_units:[{reference_id:ref,custom_id:ref,payee:{merchant_id:"TASK0011"},payments:{captures:[{id:"synthetic-shared-capture",status:"COMPLETED",amount:{currency_code:"USD",value:"11.06"},create_time:now.toISOString()}]}}]};
  },readSavedWalletOrder:async()=>({})},()=>now);
  const review=await service.review(user,{arrangementId:id});expect((await service.confirm(user,{arrangementId:id,quoteId:review.quoteId,confirmed:true,clientMetadataId:"e".repeat(32)})).state).toBe(index===0?"confirmed":"pending");
  const [count]=await sql`select count(*)::int as windows from app_private.allowance_windows w join app_private.billing_arrangements b on b.id=w.billing_arrangement_id where b.public_id=${id}`;expect(count.windows).toBe(index===0?2:1);
 }
});
