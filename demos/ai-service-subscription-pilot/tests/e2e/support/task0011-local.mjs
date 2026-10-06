import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import net from "node:net";
import postgres from "postgres";
import "./task0011-deny-network.mjs";

const binary = "/private/tmp/task0010-postgres.2V16MR/node_modules/@embedded-postgres/darwin-arm64/native/bin";
const port = 55411;
const mode = process.argv[2];
if (!["schema", "unit", "verify"].includes(mode)) throw new Error("task0011_invalid_mode");
if(["DATABASE_URL","PLAYWRIGHT_BASE_URL","PAYPAL_CLIENT_SECRET","SUPABASE_SECRET_KEY"].some(key=>process.env[key]))throw new Error("task0011_external_configuration_rejected");
await new Promise((yes,no)=>{
  const server=net.createServer();server.once("error",()=>no(new Error("task0011_port_occupied")));
  server.listen(port,"127.0.0.1",()=>server.close(yes));
});
const owned = await mkdtemp("/private/tmp/task0011-postgres-");
const directory = `${owned}/data`;
await writeFile(`${owned}/owner.json`,JSON.stringify({task:"TASK-0011",directory,port,owner:process.pid}));
const env={PATH:process.env.PATH,TMPDIR:"/private/tmp",CI:"1",DATABASE_URL:`postgresql://task0011@127.0.0.1:${port}/task0011_test`,
  NODE_OPTIONS:`--import=${resolve("tests/e2e/support/task0011-deny-network.mjs")}`,TASK0011_LOCAL:"1",VITE_SUPABASE_URL:"http://127.0.0.1:3111"};
function run(command,args,childEnv=env){const result=spawnSync(command,args,{env:childEnv,stdio:"inherit"});if(result.error||result.status!==0)throw new Error(`task0011_command_failed:${command}:${result.status}`);}
let started=false;let ownedPid=null;
try{
  run(`${binary}/initdb`,["-D",directory,"-U","task0011","--auth=trust","--no-locale","--encoding=UTF8"],{PATH:env.PATH,TMPDIR:env.TMPDIR});
  run(`${binary}/pg_ctl`,["-D",directory,"-l",`${owned}/postgres.log`,"-o",`-h 127.0.0.1 -p ${port} -k ${owned}`,"-w","start"],{PATH:env.PATH,TMPDIR:env.TMPDIR});started=true;
  const admin=postgres({host:"127.0.0.1",port,user:"task0011",database:"postgres",max:1});
  try{
    const [actual]=await admin`select current_user as owner,current_setting('data_directory') as directory`;
    const pid=Number((await readFile(`${directory}/postmaster.pid`,"utf8")).split("\n")[0]);process.kill(pid,0);
    const marker=JSON.parse(await readFile(`${owned}/owner.json`,"utf8"));
    if(marker.task!=="TASK-0011"||marker.owner!==process.pid||marker.directory!==directory||marker.port!==port)throw new Error("task0011_marker_mismatch");
    ownedPid=pid;
    if(actual.owner!=="task0011"||actual.directory!==directory)throw new Error("task0011_owner_mismatch");
    await admin.unsafe("create database task0011_test");
  }finally{await admin.end();}
  const sql=postgres(env.DATABASE_URL,{max:1,prepare:false});
  try{
    const [actual]=await sql`select current_user as owner,current_database() as database,current_setting('data_directory') as directory`;
    if(actual.owner!=="task0011"||actual.database!=="task0011_test"||actual.directory!==directory)throw new Error("task0011_target_mismatch");
    await sql.unsafe("create role anon; create role authenticated; create schema auth; create schema extensions; create table auth.users(id uuid primary key);");
    for(const file of ["20260813141941_slice001_core.sql","20260829045606_fix_demo_session_otp_lifetime.sql","20260830115316_add_provider_event_duplicate_delivery_evidence.sql","20261004074552_paypal_wallet_removal.sql"]){
      const text=await readFile(`supabase/migrations/${file}`,"utf8");if(text.trim())await sql.begin(tx=>tx.unsafe(text));
    }
    const [baseline,matrix]=(await readFile("supabase/tests/reactivation_test.sql","utf8")).split("-- TASK-0011 AFTER MIGRATION");
    await sql.unsafe(baseline);
    const tables=["accounts","checkout_intents","quotes","payment_operations","billing_arrangements","allowance_windows"];
    const before=new Map();for(const table of tables)before.set(table,await sql.unsafe(`select * from app_private.${table} order by id`));
    const migration=await readFile("supabase/migrations/20261006143750_expired_go_reactivation.sql","utf8");
    let rollbackObserved=false;
    try{await sql.begin(async tx=>{await tx.unsafe(migration);await tx.unsafe("do $$ begin raise exception 'TASK0011_INTENTIONAL_MIGRATION_ROLLBACK'; end $$;");});}
    catch(error){if(!String(error.message).includes("TASK0011_INTENTIONAL_MIGRATION_ROLLBACK"))throw error;rollbackObserved=true;}
    const [rolledBack]=await sql`select count(*)::int as columns from information_schema.columns where table_schema='app_private' and table_name='checkout_intents' and column_name='purpose'`;
    if(!rollbackObserved||rolledBack.columns!==0)throw new Error("task0011_migration_transaction_not_rolled_back");
    await sql.begin(tx=>tx.unsafe(migration));
    for(const table of tables){const rows=await sql.unsafe(`select * from app_private.${table} order by id`);const expected=before.get(table);if(rows.length!==expected.length||expected.some((row,index)=>Object.keys(row).some(key=>JSON.stringify(row[key])!==JSON.stringify(rows[index][key]))))throw new Error("task0011_baseline_history_changed");}
    if(mode==="schema"||mode==="verify")await sql.unsafe(matrix);
  }finally{await sql.end();}
  if(mode==="unit")run("npm",["run","test","--","--no-file-parallelism"]);
  if(mode==="verify"){
    for(const script of ["typecheck","lint"])run("npm",["run",script]);
    run("npm",["run","test","--","--no-file-parallelism"]);
    run("npm",["run","build:server"]);
    run("npm",["run","build:web","--","--config=tests/e2e/support/vite.task0011.config.ts"]);
    run("npm",["run","test:e2e","--","--config=playwright.task0011.config.ts"]);
  }
  console.log(JSON.stringify({task:"TASK-0011",mode,status:"passed",ownedDirectory:owned}));
}finally{
  if(started){const current=Number((await readFile(`${directory}/postmaster.pid`,"utf8")).split("\n")[0]);if(ownedPid!==null&&current!==ownedPid)throw new Error("task0011_shutdown_owner_mismatch");run(`${binary}/pg_ctl`,["-D",directory,"-m","fast","-w","stop"],{PATH:env.PATH,TMPDIR:env.TMPDIR});}
  console.log(`TASK-0011 diagnostic directory retained: ${owned}`);
}
