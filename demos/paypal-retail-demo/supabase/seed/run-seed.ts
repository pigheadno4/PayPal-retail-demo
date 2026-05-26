import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSeedDataset } from "./seed-data.js";
import { buildSeedSql } from "./seed-sql.js";

export interface SeedRunResult {
  readonly mode:
    | "dry-run"
    | "print-sql"
    | "write-sql"
    | "apply-linked"
    | "apply-local";
  readonly summary: Record<string, number>;
  readonly sqlPath?: string;
}

export async function runSeed(
  args = process.argv.slice(2),
): Promise<SeedRunResult> {
  const dataset = buildSeedDataset();
  const sql = buildSeedSql(dataset);

  if (args.includes("--print-sql")) {
    console.log(sql);
    return { mode: "print-sql", summary: dataset.summary };
  }

  const writeIndex = args.indexOf("--write");
  if (writeIndex >= 0) {
    const outputPath = args[writeIndex + 1];
    if (!outputPath) {
      throw new Error("--write requires an output path");
    }
    writeFileSync(outputPath, sql);
    return { mode: "write-sql", summary: dataset.summary, sqlPath: outputPath };
  }

  if (args.includes("--apply-linked") || args.includes("--apply-local")) {
    const mode = args.includes("--apply-linked")
      ? "apply-linked"
      : "apply-local";
    const sqlPath = writeTempSql(sql);
    const targetFlag = mode === "apply-linked" ? "--linked" : "--local";
    const result = spawnSync(
      "npx",
      ["supabase", "db", "query", targetFlag, "--file", sqlPath],
      {
        encoding: "utf8",
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      throw new Error(
        `supabase db query failed with exit code ${result.status ?? "unknown"}`,
      );
    }

    return { mode, summary: dataset.summary, sqlPath };
  }

  return { mode: "dry-run", summary: dataset.summary };
}

function writeTempSql(sql: string): string {
  const directory = mkdtempSync(join(tmpdir(), "paypal-retail-demo-seed-"));
  const sqlPath = join(directory, "seed.sql");
  writeFileSync(sqlPath, sql);
  return sqlPath;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const result = await runSeed();
  console.log(JSON.stringify(result, null, 2));
}
