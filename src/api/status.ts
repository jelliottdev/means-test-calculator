import type { DatasetResolver } from "../datasets/resolver";
import { getBundleStatus } from "./orchestrator";

export type BundleStatusResult = Awaited<ReturnType<typeof getBundleStatus>>;

export async function getAgentVisibleStatus(
  filingDate: string,
  resolver?: DatasetResolver,
): Promise<BundleStatusResult> {
  return getBundleStatus(filingDate, resolver);
}
