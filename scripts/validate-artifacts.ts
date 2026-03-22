#!/usr/bin/env node
import { resolve } from "node:path";
import { FileDatasetResolver } from "../src/datasets/fileResolver";
import { validateDatasetBundle } from "./lib/validate-artifacts";

function parseArgs(argv: string[]) {
  let filingDate = new Date().toISOString().slice(0, 10);
  let dataDir = "data/means-test";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--filing-date" && argv[i + 1]) {
      filingDate = argv[i + 1];
      i += 1;
    } else if (arg === "--data-dir" && argv[i + 1]) {
      dataDir = argv[i + 1];
      i += 1;
    }
  }
  return { filingDate, dataDir };
}

async function main() {
  const { filingDate, dataDir } = parseArgs(process.argv.slice(2));
  const resolver = new FileDatasetResolver(resolve(process.cwd(), dataDir));
  const bundle = resolver.resolve(filingDate);
  const result = validateDatasetBundle(bundle);
  process.stdout.write(JSON.stringify({ filingDate, dataDir, ...result }, null, 2) + "\n");
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }, null, 2) + "\n");
  process.exit(1);
});
