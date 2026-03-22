#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const checks = [
  { name: "threshold-fixtures", cmd: ["node", "./scripts/check-threshold-fixtures.ts"] },
];

function main() {
  const results = checks.map((check) => {
    const proc = spawnSync(check.cmd[0], check.cmd.slice(1), { encoding: "utf8" });
    return {
      name: check.name,
      ok: proc.status === 0,
      status: proc.status,
      stdout: proc.stdout,
      stderr: proc.stderr,
    };
  });

  const ok = results.every((r) => r.ok);
  process.stdout.write(JSON.stringify({ ok, results }, null, 2) + "\n");
  if (!ok) process.exit(1);
}

main();
