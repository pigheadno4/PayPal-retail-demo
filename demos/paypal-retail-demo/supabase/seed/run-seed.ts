export interface SeedRunResult {
  readonly mode: "dry-run";
  readonly profiles: readonly ["popmart", "generic"];
}

export async function runSeedDryRun(): Promise<SeedRunResult> {
  return {
    mode: "dry-run",
    profiles: ["popmart", "generic"],
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const result = await runSeedDryRun();
  console.log(JSON.stringify(result, null, 2));
}
