import {Router} from "express";
import {resolve} from "node:path";
import {createApp} from "../../../server/src/app.js";
import {createDatabaseClient} from "../../../server/src/db/client.js";
import {PostgresReactivationRepository} from "../../../server/src/domain/reactivation/repository.js";
import {ReactivationService} from "../../../server/src/domain/reactivation/service.js";
import {PayPalDefinitiveError} from "../../../server/src/domain/paypal/gateway.js";
import {PostgresPayPalWalletRepository} from "../../../server/src/domain/paypal/wallet-management.js";
import {PostgresPayPalRepository} from "../../../server/src/domain/paypal/service.js";
import {PostgresUsageRepository} from "../../../server/src/domain/usage/repository.js";
import {activateGo,readUsageSummary,generateAnswer} from "../../../server/src/domain/usage/service.js";
import {createDeterministicFixtureRunner} from "../../../server/src/domain/usage/fixtures.js";
import {createReactivationRouter} from "../../../server/src/routes/reactivation.js";
import {createUsageRouter} from "../../../server/src/routes/usage.js";
import {createPayPalRouter} from "../../../server/src/routes/paypal.js";
import type {VerifyToken} from "../../../server/src/middleware/auth.js";
import {fixtureKind,task0011Now} from "./task0011-fixture.js";
import {task0004Identity} from "./task0004-fixture.js";

const sql=createDatabaseClient(process.env.DATABASE_URL!);
const [target]=await sql`select current_user as owner,current_database() as database,current_setting('data_directory') as directory`;
if(target.owner!=="task0011"||target.database!=="task0011_test"||!String(target.directory).startsWith("/private/tmp/task0011-postgres-"))throw new Error("task0011_owned_database_required");
const verifyToken:VerifyToken=async token=>{
 const legacy=Object.values(task0004Identity).find(value=>value.token===token);if(legacy)return{userId:legacy.userId,email:"fixture@example.test"};
 const userId=token.startsWith("task0011:")?token.slice(9):"";
 return /^[0-9a-f-]{36}$/.test(userId)&&fixtureKind(userId)?{userId,email:"fixture@example.test"}:null;
};
const orders=new Map<string,unknown>();
const recoveryRepository=new PostgresReactivationRepository(sql,"TASK0011","sandbox");
const recovery=new ReactivationService(recoveryRepository,{
 createSavedWalletOrder:async input=>{
  const unit=(input.payload.purchase_units as {reference_id:string;custom_id:string}[])[0]!;
  const [owner]=await sql`select a.auth_user_id from app_private.payment_operations p join app_private.accounts a on a.id=p.account_id where p.public_id=${unit.reference_id}`;
  const kind=fixtureKind(owner.auth_user_id);
  await new Promise(done=>setTimeout(done,150));
  if(kind==="failed")throw new PayPalDefinitiveError();
  if(kind==="unknown")throw new Error("synthetic_transport_uncertainty");
  const id=`synthetic-order-${unit.reference_id}`;
  const body=kind==="confirmed"?{id,status:"COMPLETED",purchase_units:[{...unit,payee:{merchant_id:"TASK0011"},payments:{captures:[{id:`synthetic-capture-${unit.reference_id}`,status:"COMPLETED",amount:{currency_code:"USD",value:"11.06"},create_time:task0011Now.toISOString()}]}}]}:{id,status:kind==="action_required"?"PAYER_ACTION_REQUIRED":"CREATED"};orders.set(id,body);return body;
 },readSavedWalletOrder:async id=>orders.get(id),
},()=>task0011Now);
const usage=new PostgresUsageRepository(sql);const clock=()=>new Date();
const api=Router();
api.use(createReactivationRouter({verifyToken,entry:user=>recoveryRepository.readEntry(user,task0011Now),review:(user,input)=>recovery.review(user,input),confirm:(user,input)=>recovery.confirm(user,input),status:(user,id)=>recovery.status(user,id)}));
api.use(createUsageRouter({verifyToken,activate:identity=>activateGo(identity.userId,{repository:usage,clock}),readSummary:identity=>readUsageSummary(identity.userId,{repository:usage,clock}),generateAnswer:(identity,input)=>generateAnswer(identity.userId,input,{repository:usage,clock,runFixture:createDeterministicFixtureRunner(3000,identity.userId===task0004Identity.failure.userId?async()=>{await new Promise(done=>setTimeout(done,3000));throw new Error("synthetic_failure");}:undefined)})}));
const unavailable=async()=>{throw new Error("integration_not_configured");};
api.use(createPayPalRouter({verifyToken,readOperationStatus:async(identity,operationId)=>{const [account]=await sql`select id from app_private.accounts where auth_user_id=${identity.userId}`;if(!account)throw new Error("payment_not_found");return new PostgresPayPalRepository(sql).readOwnedOperationStatus({accountId:BigInt(account.id),operationId,merchantId:"TASK0011",environment:"sandbox"});},readWallet:async identity=>{const [account]=await sql`select id from app_private.accounts where auth_user_id=${identity.userId}`;return{wallet:account?await new PostgresPayPalWalletRepository(sql).readOwnedWallet({accountId:BigInt(account.id),merchantId:"TASK0011",environment:"sandbox"}):null};},removeWallet:unavailable,issueIdToken:unavailable,createOrder:unavailable,captureOrder:unavailable}));
const app=createApp({config:{port:3111,appUrl:"http://127.0.0.1:3111",databaseUrl:process.env.DATABASE_URL!,supabaseUrl:"http://127.0.0.1:3111",supabasePublishableKey:"synthetic-public",supabaseSecretKey:"synthetic-not-used",demoSessionSigningSecret:"synthetic-signing-not-used-00000000"},webDistPath:resolve("dist/web"),apiRouter:api});
const server=app.listen(3111,"127.0.0.1");
const close=()=>server.close(()=>void sql.end().finally(()=>process.exit(0)));
process.once("SIGTERM",close);process.once("SIGINT",close);
