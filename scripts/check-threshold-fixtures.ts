#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { extractThresholdCandidates, validateThresholdOrdering } from "./lib/threshold-patterns";

function main() {
  const dir = resolve(process.cwd(), "test/fixtures/thresholds");
  const files = readdirSync(dir).filter((name) => name.endsWith(".txt")).sort();
  const results = files.map((file) => {
    const text = readFileSync(join(dir, file), "utf8");
    const extracted = extractThresholdCandidates(text);
    const errors = validateThresholdOrdering(extracted.low, extracted.high);
    return {
      file,
      extracted,
      ok: errors.length === 0,
      errors,
    };
  });

  const ok = results.every((r) => r.ok);
  process.stdout.write(JSON.stringify({ ok, results }, null, 2) + "\n");
  if (!ok) process.exit(1);
}

main();
