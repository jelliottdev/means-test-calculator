#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FileDatasetResolver } from "../src/datasets/fileResolver";
import { runLegacyMeansTestForAgent, runMeansTestForAgent } from "../src/api/runtime";

type CliArgs = {
  input?: string;
  dataDir?: string;
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
    } else if (arg === "--data-dir" && argv[i + 1]) {
      args.dataDir = argv[i + 1];
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
  const dataDir = resolve(process.cwd(), args.dataDir ?? "data/means-test");
  const resolver = new FileDatasetResolver(dataDir);
  const output = args.legacy
    ? await runLegacyMeansTestForAgent(input as never, resolver)
    : await runMeansTestForAgent(input as never, resolver);
  process.stdout.write((args.pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output)) + "\n");
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  }, null, 2) + "\n");
  process.exit(1);
});
