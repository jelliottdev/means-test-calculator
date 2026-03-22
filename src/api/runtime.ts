import type { DatasetResolver } from "../datasets/resolver";
import { runAgentPreflight } from "./preflight";
import { runMeansTestResolved } from "../engine/v2/runner";
import { normalizeLegacyInput } from "../engine/v2";
import type { MeansTestInput } from "../engine/meansTest";
import type { MeansTestInputV2, MeansTestResultV2 } from "../engine/v2";

export interface SafeAgentRunResult {
  preflight: Awaited<ReturnType<typeof runAgentPreflight>>;
  result: MeansTestResultV2;
}

export async function runMeansTestForAgent(
  input: MeansTestInputV2,
  resolver?: DatasetResolver,
): Promise<SafeAgentRunResult> {
  const preflight = await runAgentPreflight(input.filingDate, resolver);
  if (!preflight.publication_ready) {
    throw new Error(`Bundle not safe for agent use: ${preflight.hard_failures.join("; ")}`);
  }
  const result = await runMeansTestResolved(input, resolver);
  return { preflight, result };
}

export async function runLegacyMeansTestForAgent(
  input: MeansTestInput,
  resolver?: DatasetResolver,
): Promise<SafeAgentRunResult> {
  return runMeansTestForAgent(normalizeLegacyInput(input), resolver);
}
