import type { ThresholdsArtifact } from "../../src/datasets/types";
import { extractThresholdCandidates, validateThresholdOrdering } from "./threshold-patterns";

export function parseThresholdsArtifactV2(params: {
  html: string;
  sourceUrl: string;
  effectiveDate: string;
  fetchedAt?: string;
  sourceHash?: string;
}): ThresholdsArtifact {
  const candidates = extractThresholdCandidates(params.html);
  const errors = validateThresholdOrdering(candidates.low, candidates.high);
  if (errors.length > 0) {
    throw new Error(`Threshold parser v2 failed: ${errors.join("; ")}`);
  }

  return {
    kind: "thresholds",
    effective_date: params.effectiveDate,
    source_url: params.sourceUrl,
    source_hash: params.sourceHash,
    fetched_at: params.fetchedAt,
    coverage: "707(b)(2) thresholds",
    warnings: candidates.matched_patterns.length > 0
      ? [`matched patterns: ${candidates.matched_patterns.join(", ")}`]
      : undefined,
    abuse_threshold_low: candidates.low!,
    abuse_threshold_high: candidates.high!,
    admin_expense_multiplier: 0.1,
  };
}
