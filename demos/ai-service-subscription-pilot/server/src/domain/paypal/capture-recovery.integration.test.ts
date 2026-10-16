import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PostgresCheckoutRepository } from "../checkout/repository.js";
import { createGoMonthlyQuote } from "../quote/go-monthly-seattle.js";
import { PostgresUsageRepository } from "../usage/repository.js";
import { PostgresPayPalRepository } from "./service.js";
import { PostgresCaptureRecoveryRepository, recoverCapturedPayment } from "./capture-recovery.js";
import { projectPayPalCaptureEvidence } from "./http-gateway.js";
import type { DatabaseClient } from "../../db/client.js";

const source = process.env.DATABASE_URL;
if (source && (new URL(source).hostname !== "127.0.0.1" || !new URL(source).pathname.includes("task0012"))) throw new Error("owned_local_fixture_required");
const NOW = new Date("2026-10-01T12:00:00.000Z");
let sql: DatabaseClient;
let admin: DatabaseClient;
const migration = new URL("../../../../supabase/migrations/20261004074552_paypal_wallet_removal.sql", import.meta.url);

async function seed() {
  const userId = randomUUID(); const merchantId=`fixture-merchant-${randomUUID()}`;
  await sql`insert into auth.users(id) values (${userId})`;
  const checkout = new PostgresCheckoutRepository(sql); const wallet = new PostgresPayPalRepository(sql);
  const hash=randomUUID().replaceAll("-", "").padEnd(64,"0");const intentId=await checkout.insertPendingIntent(hash,NOW);
  const bound=await checkout.bindVerifiedIdentityAndQuote({authUserId:userId,identityKind:"persistent",temporaryExpiresAt:null,intentId,sessionTokenHash:hash,demoSessionPublicId:randomUUID(),quote:createGoMonthlyQuote(()=>NOW)});
  const target={operationId:randomUUID(),checkoutId:intentId,apply:true};const orderId=`fixture-order-${randomUUID()}`;
  const input={accountId:bound.accountId,intentId,quoteId:bound.quote.quoteId,operationId:target.operationId,merchantId,environment:"sandbox" as const};
  await wallet.claimCreateOperation(input);await wallet.storeCreatedOrder(target.operationId,orderId);
  const claimed=await wallet.claimCaptureOperation({...input,orderId});if(claimed.kind!=="owner")throw new Error("fixture_claim_failed");
  const customerId=`fixture-customer-${randomUUID()}`;const vaultId=`fixture-vault-${randomUUID()}`;
  const raw={id:orderId,intent:"CAPTURE",status:"COMPLETED",payment_source:{paypal:{attributes:{vault:{status:"VAULTED",id:vaultId,customer:{id:customerId}}}}},purchase_units:[{reference_id:bound.quote.quoteId,amount:{currency_code:"USD",value:"5.53"},payee:{merchant_id:merchantId},payments:{captures:[{id:`fixture-capture-${randomUUID()}`,status:"COMPLETED",final_capture:true,amount:{currency_code:"USD",value:"5.53"},create_time:NOW.toISOString(),update_time:NOW.toISOString()}]}}]};
  const repo=new PostgresCaptureRecoveryRepository(sql);
  const readCapturedOrder=vi.fn(async(id:string)=>{expect(id).toBe(orderId);return raw;});
  const deps={merchantId,environment:"sandbox",readCapturedOrder,readContext:repo.readContext.bind(repo),inspectEvidence:repo.inspectEvidence.bind(repo),apply:repo.apply.bind(repo)};
  async function snapshot() {
    return sql`select o.funding_status,o.vault_status,o.funding_verified_at,o.provider_effective_at,i.state as checkout_state,
      q.issued_at,q.expires_at,q.renews_at,q.allowance_resets_at,
      (select count(*)::int from app_private.provider_events e where e.payment_operation_id=o.id) as events,
      (select count(*)::int from app_private.billing_arrangements b where b.payment_operation_id=o.id) as arrangements,
      (select count(*)::int from app_private.allowance_windows w join app_private.billing_arrangements b on b.id=w.billing_arrangement_id where b.account_id=o.account_id) as allowances,
      (select count(*)::int from app_private.usage_operations u where u.account_id=o.account_id) as usage,
      (select count(*)::int from app_private.provider_customers c where c.account_id=o.account_id) as customers,
      (select count(*)::int from app_private.payment_methods m join app_private.provider_customers c on c.id=m.provider_customer_id where c.account_id=o.account_id) as methods
      from app_private.payment_operations o join app_private.quotes q on q.id=o.quote_id join app_private.checkout_intents i on i.id=o.checkout_intent_id where o.public_id=${target.operationId}`;
  }
  return {userId,merchantId,target,raw,deps,repo,claimed,bound,customerId,vaultId,snapshot};
}

describe.skipIf(!source)("owned-local capture recovery transaction proof",()=>{
  beforeAll(async()=>{
    admin=postgres(source!,{max:1,prepare:false});
    const name=`task0012_capture_${randomUUID().replaceAll("-","")}`;
    await admin.unsafe(`create database ${name}`);
    const url=new URL(source!);url.pathname=`/${name}`;sql=postgres(url.toString(),{max:6,prepare:false});
    await sql.unsafe("create schema auth; create table auth.users(id uuid primary key)");
    for(const name of ["20260813141941_slice001_core.sql","20260829045606_fix_demo_session_otp_lifetime.sql","20260830115316_add_provider_event_duplicate_delivery_evidence.sql","20261006143750_expired_go_reactivation.sql"]){
      await sql.unsafe(await readFile(new URL(`../../../../supabase/migrations/${name}`,import.meta.url),"utf8"));
    }
  },30000);
  afterAll(async()=>{await sql?.end();await admin?.end();});
  it("reproduces 42703 before applying the exact immutable migration, then passes existing SQL assertions",async()=>{
    const f=await seed();const evidence=projectPayPalCaptureEvidence(f.raw,f.claimed.operation.orderId!);const before=await f.snapshot();
    await expect(new PostgresPayPalRepository(sql).applyCaptureEvidence(f.claimed.operation,evidence)).rejects.toMatchObject({code:"42703"});
    expect(await f.snapshot()).toEqual(before);
    const bytes=await readFile(migration);expect(createHash("sha256").update(bytes).digest("hex")).toBe("ee692d865dcbf1af03eb32bfadafc9777831b5548509a93feae4475b2850dca8");
    await sql.begin(async tx=>{await tx`set local lock_timeout='5s'`;await tx`set local statement_timeout='60s'`;await tx.unsafe(bytes.toString());});
    const connection=await sql.reserve();
    try { await connection.unsafe(await readFile(new URL("../../../../supabase/tests/paypal_wallet_removal_test.sql",import.meta.url),"utf8")); }
    finally { connection.release(); }
    expect(await f.snapshot()).toEqual(before);
    expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"applied"});
  });
  it("dry-run is read-only; apply preserves periods, writes once and grants no allowance/access",async()=>{
    const f=await seed();const before=await f.snapshot();
    expect(await recoverCapturedPayment({...f.target,apply:false},f.deps)).toMatchObject({code:"eligible"});expect(await f.snapshot()).toEqual(before);
    expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"applied"});
    const after=await f.snapshot();expect(after[0]).toMatchObject({funding_status:"completed",vault_status:"vaulted",funding_verified_at:NOW,provider_effective_at:NOW,events:1,arrangements:1,allowances:0,usage:0,customers:1,methods:1});
    for(const field of ["issued_at","expires_at","renews_at","allowance_resets_at"] as const)expect(after[0]![field]).toEqual(before[0]![field]);
    const frozen=await f.snapshot();expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"already_recovered"});expect(await f.snapshot()).toEqual(frozen);
    const event=await sql`select event_type from app_private.provider_events where merchant_id=${f.merchantId}`;expect(event).toEqual([{event_type:"PAYPAL.ORDER.CAPTURED"}]);
    const status=await new PostgresPayPalRepository(sql).readOwnedOperationStatus({accountId:f.bound.accountId,operationId:f.target.operationId,merchantId:f.merchantId,environment:"sandbox"});expect(status).toMatchObject({funding:"verified",reusableReadiness:"ready"});
    // Existing activation is separate; replay gives the same allowance, not a second benefit.
    const usage=new PostgresUsageRepository(sql);await usage.activate(f.userId,new Date(NOW.getTime()+60000));await usage.activate(f.userId,new Date(NOW.getTime()+60000));
    expect((await f.snapshot())[0]!.allowances).toBe(1);
  });
  it("concurrent applies and restart yield one event/arrangement/wallet",async()=>{
    const f=await seed();const results=await Promise.all([recoverCapturedPayment(f.target,f.deps),recoverCapturedPayment(f.target,f.deps)]);
    expect(results.map(r=>r.code).sort()).toEqual(["already_recovered","applied"]);
    expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"already_recovered"});
    expect((await f.snapshot())[0]).toMatchObject({events:1,arrangements:1,methods:1,customers:1,allowances:0,usage:0});
  });
  it("a SQL error after wallet/event work rolls the entire attempt back",async()=>{
    const f=await seed();const before=await f.snapshot();
    await sql.unsafe(`create function app_private.fixture_reject_capture() returns trigger language plpgsql as $$ begin if new.public_id='${f.target.operationId}'::uuid then raise exception 'fixture_failure'; end if; return new; end $$; create trigger fixture_capture_failure before update on app_private.payment_operations for each row execute function app_private.fixture_reject_capture()`);
    try{expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"recovery_blocked"});expect(await f.snapshot()).toEqual(before);}
    finally{await sql.unsafe("drop trigger fixture_capture_failure on app_private.payment_operations; drop function app_private.fixture_reject_capture()");}
    expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"applied"});
  });
  it.each(["none","removed","removing","unknown","other_owner"])("checks matching pre-existing wallet state %s without resetting removal",async state=>{
    const f=await seed();const otherId=randomUUID();let owner=f.bound.accountId.toString();
    if(state==="other_owner") {await sql`insert into auth.users(id) values(${otherId})`;const rows=await sql`insert into app_private.accounts(public_id,auth_user_id,identity_kind) values(${randomUUID()},${otherId},'persistent') returning id`;owner=rows[0]!.id;}
    const customer=await sql`insert into app_private.provider_customers(public_id,account_id,provider,merchant_id,environment,provider_customer_id) values(${randomUUID()},${owner},'paypal',${f.merchantId},'sandbox',${f.customerId}) returning id`;
    const removal=state==="other_owner"?"none":state;
    await sql`insert into app_private.payment_methods(public_id,provider_customer_id,merchant_id,environment,provider_vault_id,readiness,is_primary,removal_state,removal_started_at,removed_at) values(${randomUUID()},${customer[0]!.id},${f.merchantId},'sandbox',${f.vaultId},${removal==="none"?"ready":"failed"},${removal==="none"},${removal},${removal==="none"?null:NOW},${removal==="removed"?NOW:null})`;
    const before=await f.snapshot();const methods=await sql`select row_to_json(m) as row from app_private.payment_methods m where merchant_id=${f.merchantId}`;
    expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:state==="none"?"applied":"recovery_blocked"});
    if(state!=="none"){expect(await f.snapshot()).toEqual(before);expect(await sql`select row_to_json(m) as row from app_private.payment_methods m where merchant_id=${f.merchantId}`).toEqual(methods);}
    else expect((await f.snapshot())[0]!.methods).toBe(1);
  });
  it("rejects conflicting stored event and inconsistent completed records without writes",async()=>{
    const f=await seed();await sql`insert into app_private.provider_events(public_id,provider,merchant_id,environment,provider_event_id,event_type,raw_payload,signature_valid,correlation_result,payment_operation_id,received_at) values(${randomUUID()},'paypal',${f.merchantId},'sandbox',${f.raw.purchase_units[0]!.payments.captures[0]!.id},'PAYPAL.ORDER.CAPTURED','{}',true,'matched',${f.claimed.operation.internalId.toString()},${NOW})`;
    const before=await f.snapshot();expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"recovery_blocked"});expect(await f.snapshot()).toEqual(before);
    const g=await seed();expect(await recoverCapturedPayment(g.target,g.deps)).toMatchObject({code:"applied"});
    await sql`update app_private.provider_events set raw_payload='{}' where payment_operation_id=${g.claimed.operation.internalId.toString()}`;
    const inconsistent=await g.snapshot();expect(await recoverCapturedPayment(g.target,g.deps)).toMatchObject({code:"recovery_blocked"});expect(await g.snapshot()).toEqual(inconsistent);
  });
  it("does not confuse a separately correlated vault webhook with duplicate capture evidence",async()=>{
    const f=await seed();expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"applied"});
    await sql`insert into app_private.provider_events(public_id,provider,merchant_id,environment,provider_event_id,event_type,raw_payload,signature_valid,correlation_result,payment_operation_id,received_at) values(${randomUUID()},'paypal',${f.merchantId},'sandbox',${`fixture-webhook-${randomUUID()}`},'VAULT.PAYMENT-TOKEN.CREATED','{}',true,'matched',${f.claimed.operation.internalId.toString()},${NOW})`;
    const before=await f.snapshot();expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"already_recovered"});expect(await f.snapshot()).toEqual(before);
  });
  it.each([
    ["approved","selected"],["approved","identity_verified"],["approved","funded"],["approved","expired"],["approved","canceled"],
    ["completed","selected"],["completed","identity_verified"],["completed","payment_pending"],["completed","expired"],["completed","canceled"],
  ])("does not declare eligible or overwrite unexpected %s/%s state",async(fundingStatus,checkoutState)=>{
    const f=await seed();if(fundingStatus==="completed")expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"applied"});
    await sql`update app_private.checkout_intents set state=${checkoutState} where public_id=${f.target.checkoutId}`;
    const before=await f.snapshot();const apply=vi.fn(f.deps.apply);
    for(const enabled of [false,true])expect(await recoverCapturedPayment({...f.target,apply:enabled},{...f.deps,apply})).toMatchObject({code:"recovery_blocked"});
    expect(apply).not.toHaveBeenCalled();expect(await f.snapshot()).toEqual(before);
  });
  it("rechecks completed checkout state on fresh evidence read",async()=>{
    const f=await seed();expect(await recoverCapturedPayment(f.target,f.deps)).toMatchObject({code:"applied"});
    const apply=vi.fn(f.deps.apply);
    const readCapturedOrder=async()=>{await sql`update app_private.checkout_intents set state='canceled' where public_id=${f.target.checkoutId}`;return f.raw;};
    const before=await f.snapshot();expect(await recoverCapturedPayment(f.target,{...f.deps,readCapturedOrder,apply})).toMatchObject({code:"recovery_blocked"});
    expect(apply).not.toHaveBeenCalled();expect(await f.snapshot()).toEqual(before.map(row=>({...row,checkout_state:"canceled"})));
  });
  it("locked apply refuses checkout cancellation after successful read-only eligibility",async()=>{
    const f=await seed();const before=await f.snapshot();
    const inspectEvidence: typeof f.deps.inspectEvidence=async(ctx,evidence)=>{
      const result=await f.repo.inspectEvidence(ctx,evidence);
      await sql`update app_private.checkout_intents set state='canceled' where public_id=${f.target.checkoutId}`;
      return result;
    };
    expect(await recoverCapturedPayment(f.target,{...f.deps,inspectEvidence})).toMatchObject({code:"recovery_blocked"});
    expect(await f.snapshot()).toEqual(before.map(row=>({...row,checkout_state:"canceled"})));
  });
});
