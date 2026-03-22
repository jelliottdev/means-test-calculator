import type { ThresholdsArtifact } from "../../src/datasets/types";
import { parseDollar } from "./html";

/**
 * Strict parser for threshold values referenced by §707(b)(2).
 *
 * This parser is conservative and only succeeds when it can find both low and high
 * threshold values in official source text. The administrative expense multiplier
 * remains fixed at 10% because that is formula logic rather than a periodically
 * published lookup table.
 */
export function parseThresholdsArtifact(params: {
  html: string;
  sourceUrl: string;
  effectiveDate: string;
  fetchedAt?: string;
  sourceHash?: string;
}): ThresholdsArtifact {
  const lowPatterns = [
    /\$([\d,]+)\s*(?:or less|no presumption|low threshold)/i,
    /low threshold[^\d$]*\$([\d,]+)/i,
  ];
  const highPatterns = [
    /\$([\d,]+)\s*(?:or more|presumption of abuse|high threshold)/i,
    /high threshold[^\d$]*\$([\d,]+)/i,
  ];

  let low = 0;
  let high = 0;

  for (const pattern of lowPatterns) {
    const match = params.html.match(pattern);
    if (match) {
      low = parseDollar(match[1]);
      break;
    }
  }

  for (const pattern of highPatterns) {
    const match = params.html.match(pattern);
    if (match) {
      high = parseDollar(match[1]);
      break;
    }
  }

  if (!low || !high) {
    throw new Error(`Threshold parser incomplete: low=${low || "missing"}, high=${high || "missing"}`);
  }

  if (high <= low) {
    throw new Error(`Threshold parser invalid ordering: low=${low}, high=${high}`);
  }

  return {
    kind: "thresholds",
    effective_date: params.effectiveDate,
    source_url: params.sourceUrl,
    source_hash: params.sourceHash,
    fetched_at: params.fetchedAt,
    coverage: "707(b)(2) thresholds",
    abuse_threshold_low: low,
    abuse_threshold_high: high,
    admin_expense_multiplier: 0.1,
  };
}
