#!/usr/bin/env node
import { resolve } from "node:path";
import { getEmbeddedDatasetBundle } from "../src/datasets/embedded";
import { writeArtifacts } from "./lib/write-artifacts";

function parseArgs(argv: string[]) {
  let filingDate = new Date().toISOString().slice(0, 10);
  let outDir = "data/means-test";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--filing-date" && argv[i + 1]) {
      filingDate = argv[i + 1];
      i += 1;
    } else if (arg === "--out-dir" && argv[i + 1]) {
      outDir = argv[i + 1];
      i += 1;
    }
  }

  return { filingDate, outDir };
}

async function main() {
  const { filingDate, outDir } = parseArgs(process.argv.slice(2));
  const bundle = getEmbeddedDatasetBundle(filingDate);
  writeArtifacts(resolve(process.cwd(), outDir), {
    filingDate,
    medianIncome: bundle.median_income,
    nationalStandards: bundle.national_standards,
    transportation: bundle.transportation,
    housing: bundle.housing,
    thresholds: bundle.thresholds,
  });
  process.stdout.write(JSON.stringify({ ok: true, filingDate, outDir }, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2) + "\n");
  process.exit(1);
});
