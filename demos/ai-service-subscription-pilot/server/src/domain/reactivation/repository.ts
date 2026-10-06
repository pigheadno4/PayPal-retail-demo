import type { DatabaseClient } from "../../db/client.js";
import type { ReactivationEntry } from "../../../../shared/src/reactivation.js";
import type { ReactivationConfirm, ReactivationOutcome, ReactivationReview } from "../../../../shared/src/reactivation.js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createGoMonthlyReactivationQuote } from "../quote/go-monthly-seattle.js";
import { buildSavedWalletOrder, buildFraudNetBootstrap } from "../paypal/payload.js";
import type { PayPalOrderPayload, SavedWalletFundingEvidence } from "../paypal/gateway.js";
import { addCalendarMonth } from "../usage/calendar-month.js";

export type RecoveryClaim={operationId:string;ownsCreate:boolean;payload:PayPalOrderPayload;requestId:string};
const usd=(cents:number)=>({currency:"USD" as const,cents});
type ReviewRow={public_id:string;intent_public_id:string;base_cents:string;promotion_cents:string;taxable_subtotal_cents:string;tax_cents:string;total_cents:string;tax_version:string;expires_at:Date;time_zone:"America/Los_Angeles"};
function reviewDto(row:ReviewRow,arrangementId:string,environment:"sandbox"|"live"):ReactivationReview{return{arrangementId,intentId:row.intent_public_id,quoteId:row.public_id,base:usd(Number(row.base_cents)),promotion:usd(Number(row.promotion_cents)),taxableSubtotal:usd(Number(row.taxable_subtotal_cents)),tax:usd(Number(row.tax_cents)),dueToday:usd(Number(row.total_cents)),taxVersion:row.tax_version,pricingVersion:"go-monthly-reactivation-v1",expiresAt:new Date(row.expires_at).toISOString(),timeZone:row.time_zone,termStart:"verified_funding",duration:"one_calendar_month",includedUnits:100,fraudNet:buildFraudNetBootstrap(environment)};}
export class PostgresReactivationRepository {
  constructor(private readonly sql:DatabaseClient,private readonly merchantId:string,private readonly environment:"sandbox"|"live"){}
  async readEntry(userId:string,now:Date):Promise<ReactivationEntry>{
    const rows=await this.sql`
      select b.public_id,b.allowance_resets_at,b.entitlement_status,b.funding_status,q.time_zone,
        p.funding_status as original_funding,w.id as previous_window_id,
        (m.id is not null and m.readiness='ready' and m.is_primary and m.removal_state='none'
          and c.account_id=b.account_id and c.merchant_id=${this.merchantId} and c.environment=${this.environment}
          and m.merchant_id=c.merchant_id and m.environment=c.environment and b.reusable_readiness='ready') as eligible,
        exists(select 1 from app_private.payment_operations recovery where recovery.reactivation_arrangement_id=b.id
          and recovery.reactivation_previous_window_id=w.id and recovery.reactivation_state in ('claimed','pending','action_required')) as pending
      from app_private.billing_arrangements b join app_private.accounts a on a.id=b.account_id
      join app_private.quotes q on q.id=b.quote_id join app_private.payment_operations p on p.id=b.payment_operation_id
      left join app_private.payment_methods m on m.id=b.payment_method_id
      left join app_private.provider_customers c on c.id=m.provider_customer_id
      left join lateral(select id from app_private.allowance_windows where billing_arrangement_id=b.id order by window_starts_at desc,id desc limit 1)w on true
      where a.auth_user_id=${userId} and b.tier='go' and b.cadence='monthly'
    `;
    if(!rows.length)throw new Error("reactivation_not_found");
    const row=rows[0]!;
    if(rows.length!==1||row.entitlement_status==='canceled'||row.funding_status!=='verified'||row.original_funding!=='completed'
      ||!row.previous_window_id||new Date(row.allowance_resets_at).getTime()>now.getTime())throw new Error("reactivation_not_available");
    const eligible=Boolean(row.eligible);const pending=Boolean(row.pending);
    return {state:"expired",arrangementId:row.public_id,paidThrough:new Date(row.allowance_resets_at).toISOString(),timeZone:row.time_zone,wallet:{label:"Saved PayPal wallet",eligible},canReview:eligible&&!pending,blocker:pending?"payment_pending":eligible?"none":"wallet_unavailable"};
  }

  async review(userId:string,input:{arrangementId:string;currentQuoteId?:string},now:Date):Promise<ReactivationReview>{
    const entry=await this.readEntry(userId,now);
    if(entry.arrangementId!==input.arrangementId)throw new Error("reactivation_not_found");
    if(!entry.canReview)throw new Error("reactivation_not_available");
    const draft=createGoMonthlyReactivationQuote(()=>now);
    return this.sql.begin(async tx=>{
      const [b]=await tx`select b.id,b.account_id from app_private.billing_arrangements b join app_private.accounts a on a.id=b.account_id where b.public_id=${input.arrangementId} and a.auth_user_id=${userId} for update of b`;
      if(!b)throw new Error("reactivation_not_found");
      const intents=await tx`select id,public_id from app_private.checkout_intents where account_id=${b.account_id} and purpose='reactivation' and reactivation_arrangement_id=${b.id} order by id desc limit 1`;
      const i=intents[0]??(await tx`insert into app_private.checkout_intents(public_id,account_id,anonymous_session_token_hash,tier,cadence,state,purpose,reactivation_arrangement_id)values(${randomUUID()},${b.account_id},${randomBytes(32)},'go','monthly','identity_verified','reactivation',${b.id})returning id,public_id`)[0]!;
      const current=(await tx`select q.*,${i.public_id}::uuid as intent_public_id from app_private.quotes q where checkout_intent_id=${i.id} and not exists(select 1 from app_private.quotes r where r.supersedes_quote_id=q.id) order by id desc limit 1`)[0];
      if(input.currentQuoteId&&current?.public_id!==input.currentQuoteId)throw new Error("stale_quote");
      if(current&&new Date(current.expires_at)>now&&current.tax_version===draft.taxVersion&&Number(current.total_cents)===draft.totalCents)return reviewDto(current as ReviewRow,input.arrangementId,this.environment);
      const [q]=await tx`insert into app_private.quotes(public_id,checkout_intent_id,currency,base_cents,promotion_cents,taxable_subtotal_cents,tax_basis_points,tax_cents,total_cents,pricing_version,tax_version,issued_at,expires_at,renews_at,allowance_resets_at,time_zone,supersedes_quote_id)
        values(${randomUUID()},${i.id},'USD',${draft.baseCents},0,${draft.taxableSubtotalCents},${draft.taxBasisPoints},${draft.taxCents},${draft.totalCents},${draft.pricingVersion},${draft.taxVersion},${new Date(draft.issuedAt)},${new Date(draft.expiresAt)},null,null,${draft.timeZone},${current?.id??null})returning *,${i.public_id}::uuid as intent_public_id`;
      return reviewDto(q as ReviewRow,input.arrangementId,this.environment);
    });
  }

  async claim(userId:string,input:ReactivationConfirm,now:Date):Promise<RecoveryClaim>{
    return this.sql.begin(async tx=>{
      const [binding]=await tx`select b.id,b.payment_method_id from app_private.billing_arrangements b join app_private.accounts a on a.id=b.account_id where b.public_id=${input.arrangementId} and a.auth_user_id=${userId}`;
      if(!binding)throw new Error("reactivation_not_found");
      const [m]=await tx`select m.*,c.account_id as owner_account,c.provider_customer_id as customer,c.merchant_id as customer_merchant,c.environment as customer_environment from app_private.payment_methods m join app_private.provider_customers c on c.id=m.provider_customer_id where m.id=${binding.payment_method_id} for update of m`;
      const [b]=await tx`select * from app_private.billing_arrangements where id=${binding.id} for update`;
      const [sameQuote]=await tx`select p.public_id,p.create_request_id from app_private.payment_operations p join app_private.quotes q on q.id=p.quote_id where p.reactivation_arrangement_id=${b.id} and p.account_id=${b.account_id} and q.public_id=${input.quoteId} and p.reactivation_state in ('claimed','pending','action_required','confirmed') limit 1`;
      if(sameQuote)return{operationId:sameQuote.public_id,ownsCreate:false,payload:{},requestId:sameQuote.create_request_id};
      const [w]=await tx`select * from app_private.allowance_windows where billing_arrangement_id=${b.id} order by window_starts_at desc,id desc limit 1`;
      if(!w)throw new Error("reactivation_not_available");
      const [existing]=await tx`select public_id,create_request_id from app_private.payment_operations where reactivation_arrangement_id=${b.id} and reactivation_previous_window_id=${w.id} and reactivation_state in ('claimed','pending','action_required','confirmed') limit 1`;
      if(existing)return{operationId:existing.public_id,ownsCreate:false,payload:{},requestId:existing.create_request_id};
      const [originalFunding]=await tx`select id from app_private.payment_operations where id=${b.payment_operation_id} and account_id=${b.account_id} and checkout_intent_id=${b.checkout_intent_id} and quote_id=${b.quote_id} and merchant_id=${this.merchantId} and environment=${this.environment} and funding_status='completed' and funding_verified_at is not null`;
      if(!originalFunding)throw new Error("reactivation_not_available");
      if(!m||m.owner_account!==b.account_id||m.merchant_id!==this.merchantId||m.environment!==this.environment||m.customer_merchant!==this.merchantId||m.customer_environment!==this.environment||m.readiness!=="ready"||!m.is_primary||m.removal_state!=="none"||b.payment_method_id!==m.id||b.reusable_readiness!=="ready"||b.funding_status!=="verified"||b.entitlement_status==="canceled"||new Date(b.allowance_resets_at)>now||new Date(w.window_ends_at)>now)throw new Error("reactivation_not_available");
      const [q]=await tx`select q.*,i.public_id as intent_public_id,i.account_id,i.id as intent_id from app_private.quotes q join app_private.checkout_intents i on i.id=q.checkout_intent_id where q.public_id=${input.quoteId} and i.account_id=${b.account_id} and i.purpose='reactivation' and i.reactivation_arrangement_id=${b.id} and not exists(select 1 from app_private.quotes r where r.supersedes_quote_id=q.id)`;
      const draft=createGoMonthlyReactivationQuote(()=>now);
      if(!q||new Date(q.expires_at)<=now||q.pricing_version!==draft.pricingVersion||q.tax_version!==draft.taxVersion||Number(q.total_cents)!==draft.totalCents||Number(q.base_cents)!==draft.baseCents||Number(q.promotion_cents)!==0)throw new Error("stale_quote");
      const operationId=randomUUID();const payload=buildSavedWalletOrder(reviewDto(q as ReviewRow,input.arrangementId,this.environment),m.provider_vault_id,operationId);const requestId=randomUUID();
      await tx`insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,paypal_customer_id,create_request_id,capture_request_id,funding_status,vault_status,reactivation_arrangement_id,reactivation_previous_window_id,reactivation_state,request_body_hash,created_at,updated_at)
        values(${operationId},${q.intent_id},${q.id},${b.account_id},${this.merchantId},${this.environment},${m.customer},${requestId},${randomUUID()},'created','not_requested',${b.id},${w.id},'claimed',${createHash("sha256").update(JSON.stringify(payload)).digest("hex")},${now},${now})`;
      return{operationId,ownsCreate:true,payload,requestId};
    });
  }

  async readOutcome(userId:string,operationId:string):Promise<ReactivationOutcome>{
    const [row]=await this.sql`select p.*,w.window_starts_at,w.window_ends_at,q.time_zone from app_private.payment_operations p join app_private.accounts a on a.id=p.account_id join app_private.quotes q on q.id=p.quote_id left join app_private.allowance_windows w on w.funding_payment_operation_id=p.id where a.auth_user_id=${userId} and p.public_id=${operationId} and p.reactivation_arrangement_id is not null`;
    if(!row)throw new Error("reactivation_not_found");
    return row.reactivation_state==='confirmed'?{operationId,state:"confirmed",term:{startsAt:new Date(row.window_starts_at).toISOString(),endsAt:new Date(row.window_ends_at).toISOString(),timeZone:row.time_zone,includedUnits:100}}:{operationId,state:row.reactivation_state==='claimed'?"pending":row.reactivation_state};
  }
  async recordNonFunding(operationId:string,state:"pending"|"action_required"|"failed",orderId:string|null){
    await this.sql`update app_private.payment_operations set reactivation_state=${state},paypal_order_id=coalesce(paypal_order_id,${orderId}),funding_status=${state==='failed'?'failed':'created'} where public_id=${operationId} and reactivation_state in ('claimed','pending')`;
  }
  async claimReconcile(userId:string,operationId:string,now:Date):Promise<string|null>{
    const rows=await this.sql`update app_private.payment_operations p set reactivation_reconciled_at=${now} from app_private.accounts a where a.id=p.account_id and a.auth_user_id=${userId} and p.public_id=${operationId} and p.reactivation_state='pending' and p.paypal_order_id is not null and p.reactivation_reconciled_at is null returning p.paypal_order_id`;
    return rows[0]?.paypal_order_id??null;
  }
  async complete(userId:string,operationId:string,evidence:SavedWalletFundingEvidence,now:Date){
    await this.sql.begin(async tx=>{
      const [initial]=await tx`select p.reactivation_arrangement_id,b.payment_method_id from app_private.payment_operations p join app_private.accounts a on a.id=p.account_id join app_private.billing_arrangements b on b.id=p.reactivation_arrangement_id where p.public_id=${operationId} and a.auth_user_id=${userId}`;
      if(!initial)throw new Error("reactivation_not_found");
      const [method]=await tx`select id,removal_state,is_primary from app_private.payment_methods where id=${initial.payment_method_id} for update`;
      const [b]=await tx`select * from app_private.billing_arrangements where id=${initial.reactivation_arrangement_id} for update`;
      const [p]=await tx`select * from app_private.payment_operations where public_id=${operationId} for update`;
      if(p.reactivation_state==='confirmed')return;
      const [w]=await tx`select * from app_private.allowance_windows where id=${p.reactivation_previous_window_id} for update`;
      const [q]=await tx`select q.*,i.account_id,i.purpose,i.reactivation_arrangement_id from app_private.quotes q join app_private.checkout_intents i on i.id=q.checkout_intent_id where q.id=${p.quote_id}`;
      const startsAt=new Date(evidence.capturedAt);const endsAt=new Date(addCalendarMonth(evidence.capturedAt,q.time_zone));
      if(!['claimed','pending'].includes(p.reactivation_state)||q.purpose!=='reactivation'||q.account_id!==b.account_id||q.reactivation_arrangement_id!==b.id||w.billing_arrangement_id!==b.id||evidence.orderId!==(p.paypal_order_id??evidence.orderId)||evidence.operationReference!==p.public_id||evidence.payeeMerchantId!==p.merchant_id||evidence.amount.cents!==Number(q.total_cents)||startsAt>now||startsAt<new Date(p.created_at)||startsAt<new Date(w.window_ends_at))throw new Error("invalid_funding_evidence");
      await tx`insert into app_private.provider_events(public_id,provider,merchant_id,environment,provider_event_id,event_type,raw_payload,signature_valid,correlation_result,payment_operation_id,received_at,processed_at)
        values(${randomUUID()},'paypal',${this.merchantId},${this.environment},${`recovery-${evidence.captureId}`},'SAVED_WALLET.FUNDING_VERIFIED',${JSON.stringify({captureStatus:"COMPLETED",amount:evidence.amount,capturedAt:evidence.capturedAt})}::jsonb,true,'matched',${p.id},${now},${now})`;
      await tx`update app_private.payment_operations set paypal_order_id=${evidence.orderId},reactivation_capture_id=${evidence.captureId},reactivation_state='confirmed',funding_status='completed',provider_effective_at=${startsAt},funding_verified_at=${now},updated_at=${now} where id=${p.id}`;
      await tx`insert into app_private.allowance_windows(public_id,billing_arrangement_id,window_starts_at,window_ends_at,granted_units,reserved_units,committed_units,funding_payment_operation_id,funding_quote_id)values(${randomUUID()},${b.id},${startsAt},${endsAt},100,0,0,${p.id},${q.id})`;
      await tx`update app_private.billing_arrangements set renewal_at=${endsAt},allowance_resets_at=${endsAt},entitlement_status=${method?.removal_state==='none'&&method.is_primary&&endsAt>now?'active':'suspended'},updated_at=${now} where id=${b.id}`;
    });
  }
}
