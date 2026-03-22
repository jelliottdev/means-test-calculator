#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeLegacyInput, runMeansTestV2 } from "../engine/v2";

type CliArgs = {
  input?: string;
  pretty: boolean;
  legacy: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { pretty: false, legacy: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input" && argv[i + 1]) {
      args.input = argv[i + 1];
      i += 1;
    } else if (arg === "--pretty") {
      args.pretty = true;
    } else if (arg === "--legacy") {
      args.legacy = true;
    }
  }
  return args;
}

function readStdin(): Promise<string> {
  return new Promise((resolveStdin, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolveStdin(data));
    process.stdin.on("error", reject);
  });
}

async function loadInput(args: CliArgs): Promise<unknown> {
  if (args.input) {
    const filepath = resolve(process.cwd(), args.input);
    return JSON.parse(readFileSync(filepath, "utf8"));
  }
  const raw = await readStdin();
  if (!raw.trim()) {
    throw new Error("No JSON input provided. Use --input <file> or pipe JSON via stdin.");
  }
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = await loadInput(args);
  const v2Input = args.legacy ? normalizeLegacyInput(input as never) : input;
  const result = runMeansTestV2(v2Input as never);
  const output = args.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  process.stdout.write(output + "\n");
}

main().catch((error) => {
  const payload = {
    error: true,
    message: error instanceof Error ? error.message : String(error),
  };
  process.stderr.write(JSON.stringify(payload, null, 2) + "\n");
  process.exit(1);
});
