import type { MeansTestResultV2 } from "../engine/v2/types";

export function canExportB122A2(result: MeansTestResultV2): boolean {
  return result.outcome === "PASS" || result.outcome === "FAIL" || result.outcome === "BORDERLINE";
}
