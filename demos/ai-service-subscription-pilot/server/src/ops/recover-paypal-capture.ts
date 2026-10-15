import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import type { DatabaseClient } from "../db/client.js";
import { PostgresCaptureRecoveryRepository, recoverCapturedPayment, validRecoveryUuid, type RecoveryTarget } from "../domain/paypal/capture-recovery.js";
import { HttpPayPalGateway } from "../domain/paypal/http-gateway.js";

type Config = Readonly<{ merchantId: string; clientId: string; clientSecret: string }>;
type Result = { code: string; operationId?: string; mode?: string; amount?: {currency: "USD"; cents: number}; fundingEligible?: boolean; vaultEligible?: boolean };
type Session = { end(): Promise<unknown> };
type ConnectionOptions = {
  max: 1; prepare: false; connect_timeout: number; idle_timeout: number;
  ssl: { ca: string; rejectUnauthorized: true };
  connection: { default_transaction_read_only: boolean; statement_timeout: number; lock_timeout: number };
};
type CliDependencies = Readonly<{
  readCa(path: string): Promise<string>;
  connect(url: string, options: ConnectionOptions): Session;
  execute(target: RecoveryTarget, session: Session, config: Config): Promise<Result>;
  output(result: Result): void;
}>;
const defaults: CliDependencies = {
  readCa: path => readFile(path, "utf8"),
  connect: (url, options) => postgres(url, options),
  execute: (target, session, config) => {
    const repository = new PostgresCaptureRecoveryRepository(session as DatabaseClient);
    const gateway = new HttpPayPalGateway({ ...config, environment: "sandbox" });
    return recoverCapturedPayment(target, {
      ...config, environment: "sandbox",
      readContext: input => repository.readContext(input),
      readCapturedOrder: orderId => gateway.readCapturedOrder(orderId),
      inspectEvidence: (ctx, evidence) => repository.inspectEvidence(ctx, evidence),
      apply: (ctx, evidence) => repository.apply(ctx, evidence),
    });
  },
  output: result => console.log(JSON.stringify(result)),
};

export async function runRecoveryCli(argv: readonly string[], env: NodeJS.ProcessEnv, dependencies: CliDependencies = defaults): Promise<number> {
  let session: Session | undefined; let result: Result = {code:"recovery_blocked"}; let exit = 1;
  try {
    const values = new Map<string, string>(); let apply = false;
    for (let index = 0; index < argv.length; index++) {
      const flag = argv[index]!;
      if (flag === "--apply" && !apply) { apply = true; continue; }
      if (!["--operation","--checkout","--database-ca"].includes(flag) || values.has(flag) || !argv[index+1] || argv[index+1]!.startsWith("--")) throw new Error("recovery_blocked");
      values.set(flag, argv[++index]!);
    }
    const operationId=values.get("--operation")??""; const checkoutId=values.get("--checkout")??""; const caPath=values.get("--database-ca");
    if (!validRecoveryUuid(operationId) || !validRecoveryUuid(checkoutId) || !caPath || env.PAYPAL_ENVIRONMENT!=="sandbox"
      || !env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_MERCHANT_ID || !env.DATABASE_URL) throw new Error("recovery_blocked");
    const url = new URL(env.DATABASE_URL);
    if (!["postgres:","postgresql:"].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)
      || [...url.searchParams.keys()].some(k=> k.toLowerCase().startsWith("ssl") || k==="options")) throw new Error("recovery_blocked");
    const ca=await dependencies.readCa(caPath); if (!ca.trim()) throw new Error("recovery_blocked");
    session=dependencies.connect(env.DATABASE_URL, { max:1,prepare:false,connect_timeout:10,idle_timeout:5,
      ssl:{ca,rejectUnauthorized:true}, connection:{default_transaction_read_only:!apply,statement_timeout:60000,lock_timeout:5000} });
    const outcome=await dependencies.execute({operationId,checkoutId,apply},session,{merchantId:env.PAYPAL_MERCHANT_ID,clientId:env.PAYPAL_CLIENT_ID,clientSecret:env.PAYPAL_CLIENT_SECRET});
    if (!["eligible","applied","already_recovered"].includes(outcome.code)) throw new Error("recovery_blocked");
    result={operationId,mode:apply?"apply":"dry_run",code:outcome.code,fundingEligible:outcome.fundingEligible===true,vaultEligible:outcome.vaultEligible===true,
      ...(outcome.amount ? {amount:{currency:"USD",cents:outcome.amount.cents}} : {})};
    exit=0;
  } catch { result={code:"recovery_blocked"}; }
  finally { if(session)try { await session.end(); } catch { result={code:"recovery_blocked"};exit=1; } }
  dependencies.output(result); return exit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await runRecoveryCli(process.argv.slice(2), process.env);
}
