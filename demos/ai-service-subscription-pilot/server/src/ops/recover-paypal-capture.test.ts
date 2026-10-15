import { describe, expect, it, vi } from "vitest";
import { runRecoveryCli } from "./recover-paypal-capture.js";

const args = ["--operation", "11111111-1111-4111-8111-111111111111", "--checkout", "22222222-2222-4222-8222-222222222222", "--database-ca", "/owned/ca.crt"];
const env = { DATABASE_URL: "postgresql://operator:private-password@db.example.test/demo", PAYPAL_ENVIRONMENT: "sandbox", PAYPAL_CLIENT_ID: "private-client", PAYPAL_CLIENT_SECRET: "private-secret", PAYPAL_MERCHANT_ID: "private-merchant" };
function fixture() {
  const end = vi.fn(async () => undefined); const connect = vi.fn(() => ({ end }));
  const readCa = vi.fn(async () => "test-certificate"); const output = vi.fn();
  const execute = vi.fn(async () => ({ code: "eligible", fundingEligible: true, vaultEligible: true }));
  return {end,connect,readCa,output,execute};
}
describe("recovery operator CLI", () => {
  it("defaults to a readonly TLS verified session, emits only safe result and closes it", async () => {
    const f = fixture();
    expect(await runRecoveryCli(args, env, f)).toBe(0);
    expect(f.connect).toHaveBeenCalledWith(env.DATABASE_URL, expect.objectContaining({ max: 1, ssl: { ca: "test-certificate", rejectUnauthorized: true }, connection: { default_transaction_read_only: true, statement_timeout: 60000, lock_timeout: 5000 } }));
    expect(f.execute).toHaveBeenCalledWith(expect.objectContaining({ apply: false }), expect.anything(), expect.anything());
    expect(f.end).toHaveBeenCalledOnce();
    expect(JSON.stringify(f.output.mock.calls)).not.toContain("private");
  });
  it("requires explicit --apply for a writable session", async () => {
    const f = fixture(); expect(await runRecoveryCli([...args, "--apply"], env, f)).toBe(0);
    expect(f.connect).toHaveBeenCalledWith(env.DATABASE_URL, expect.objectContaining({connection: expect.objectContaining({default_transaction_read_only: false})}));
    expect(f.execute).toHaveBeenCalledWith(expect.objectContaining({apply:true}), expect.anything(), expect.anything());
  });
  it.each([
    ["unknown flag", [...args,"--token","private"], env], ["duplicate flag", [...args,"--operation",args[1]!],env],
    ["invalid UUID", ["--operation","private",...args.slice(2)],env], ["missing cert",args.slice(0,4),env],
    ["live provider",args,{...env,PAYPAL_ENVIRONMENT:"live"}], ["no provider env",args,{...env,PAYPAL_ENVIRONMENT:""}],
    ["no secret",args,{...env,PAYPAL_CLIENT_SECRET:""}], ["wrong DB protocol",args,{...env,DATABASE_URL:"https://private"}],
    ["TLS override",args,{...env,DATABASE_URL:env.DATABASE_URL+"?sslmode=disable"}],
  ])("rejects %s before connecting", async (_name, argv, config) => {
    const f=fixture();expect(await runRecoveryCli(argv as string[],config as typeof env,f)).toBe(1);
    expect(f.connect).not.toHaveBeenCalled();expect(f.execute).not.toHaveBeenCalled();
    expect(f.output).toHaveBeenCalledExactlyOnceWith({code:"recovery_blocked"});
  });
  it("closes on unexpected SQL/provider failure without printing private exceptions", async () => {
    const f=fixture();f.execute.mockRejectedValue(new Error("private-password sql"));
    expect(await runRecoveryCli(args,env,f)).toBe(1);expect(f.end).toHaveBeenCalledOnce();
    expect(f.output).toHaveBeenCalledExactlyOnceWith({code:"recovery_blocked"});
  });
  it("exits nonzero on blocked recovery", async () => {
    const f=fixture();f.execute.mockResolvedValue({code:"recovery_blocked",fundingEligible:false,vaultEligible:false});
    expect(await runRecoveryCli(args,env,f)).toBe(1);expect(f.end).toHaveBeenCalledOnce();
  });
});
