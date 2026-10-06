import {randomUUID} from "node:crypto";
import postgres from "postgres";
export const task0011Now=new Date("2026-10-06T12:00:00Z");
const prefixes={confirmed:"b1000011",pending:"b2000011",action_required:"b3000011",failed:"b4000011",unknown:"b5000011",unavailable:"b6000011"} as const;
export type RecoveryFixtureKind=keyof typeof prefixes;
export function fixtureKind(userId:string):RecoveryFixtureKind{return Object.keys(prefixes).find(k=>prefixes[k as RecoveryFixtureKind]===userId.slice(0,8)) as RecoveryFixtureKind;}
export async function seedRecoveryFixture(kind:RecoveryFixtureKind){
 const sql=postgres(process.env.DATABASE_URL!,{max:1});const userId=prefixes[kind]+randomUUID().slice(8);
 try{
  const [target]=await sql`select current_user as owner,current_database() as database,current_setting('data_directory') as directory`;
  if(target.owner!=="task0011"||target.database!=="task0011_test"||!String(target.directory).startsWith("/private/tmp/task0011-postgres-"))throw new Error("task0011_owned_database_required");
  await sql`insert into auth.users(id)values(${userId})`;
  const [a]=await sql`insert into app_private.accounts(public_id,auth_user_id,identity_kind)values(${randomUUID()},${userId},'persistent')returning id`;
  const [i]=await sql`insert into app_private.checkout_intents(public_id,account_id,anonymous_session_token_hash,tier,cadence,state)values(${randomUUID()},${a.id},${Buffer.alloc(32,11)},'go','monthly','funded')returning id`;
  const [q]=await sql`insert into app_private.quotes(public_id,checkout_intent_id,currency,base_cents,promotion_cents,taxable_subtotal_cents,tax_basis_points,tax_cents,total_cents,pricing_version,tax_version,issued_at,expires_at,renews_at,allowance_resets_at,time_zone)values(${randomUUID()},${i.id},'USD',1000,-500,500,1055,53,553,'go-monthly-intro-v1','us-wa-seattle-digital-ai-q3-2026-v1','2026-08-01','2026-08-01 00:15Z','2026-09-01','2026-09-01','America/Los_Angeles')returning id`;
  const [p]=await sql`insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,create_request_id,capture_request_id,funding_status,vault_status,funding_verified_at)values(${randomUUID()},${i.id},${q.id},${a.id},'TASK0011','sandbox',${randomUUID()},${randomUUID()},'completed','vaulted','2026-08-01')returning id`;
  const [c]=await sql`insert into app_private.provider_customers(public_id,account_id,provider,merchant_id,environment,provider_customer_id)values(${randomUUID()},${a.id},'paypal','TASK0011','sandbox',${`synthetic-${randomUUID()}`})returning id`;
  const [m]=await sql`insert into app_private.payment_methods(public_id,provider_customer_id,merchant_id,environment,provider_vault_id,readiness,is_primary,removal_state,removal_started_at)values(${randomUUID()},${c.id},'TASK0011','sandbox',${`synthetic-${randomUUID()}`},${kind==="unavailable"?"failed":"ready"},${kind!=="unavailable"},${kind==="unavailable"?"unknown":"none"},${kind==="unavailable"?task0011Now:null})returning id`;
  const [b]=await sql`insert into app_private.billing_arrangements(public_id,account_id,checkout_intent_id,quote_id,payment_operation_id,payment_method_id,tier,cadence,funding_status,reusable_readiness,entitlement_status,renewal_at,allowance_resets_at)values(${randomUUID()},${a.id},${i.id},${q.id},${p.id},${m.id},'go','monthly','verified','ready','active','2026-09-01','2026-09-01')returning id,public_id`;
  await sql`insert into app_private.allowance_windows(public_id,billing_arrangement_id,window_starts_at,window_ends_at,granted_units,reserved_units,committed_units)values(${randomUUID()},${b.id},'2026-08-01','2026-09-01',100,0,20)`;
  return {userId,token:`task0011:${userId}`,arrangementId:b.public_id as string};
 }finally{await sql.end();}
}
