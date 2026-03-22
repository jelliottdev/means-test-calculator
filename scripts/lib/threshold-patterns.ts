import { parseDollar } from "./html";

export interface ThresholdMatch {
  low?: number;
  high?: number;
  matched_patterns: string[];
}

const LOW_PATTERNS: Array<[string, RegExp]> = [
  ["low-or-less", /\$([\d,]+)\s*(?:or less)/i],
  ["low-no-presumption", /\$([\d,]+)[^\n<]{0,80}no presumption/i],
  ["low-threshold-label", /low threshold[^\d$]{0,40}\$([\d,]+)/i],
  ["low-presumption-range", /less than\s*\$([\d,]+)/i],
];

const HIGH_PATTERNS: Array<[string, RegExp]> = [
  ["high-or-more", /\$([\d,]+)\s*(?:or more)/i],
  ["high-presumption", /\$([\d,]+)[^\n<]{0,80}presumption of abuse/i],
  ["high-threshold-label", /high threshold[^\d$]{0,40}\$([\d,]+)/i],
  ["high-presumption-range", /at least\s*\$([\d,]+)/i],
];

export function extractThresholdCandidates(html: string): ThresholdMatch {
  const matched_patterns: string[] = [];
  let low: number | undefined;
  let high: number | undefined;

  for (const [name, pattern] of LOW_PATTERNS) {
    const match = html.match(pattern);
    if (match) {
      const value = parseDollar(match[1]);
      if (value > 0) {
        low = value;
        matched_patterns.push(name);
        break;
      }
    }
  }

  for (const [name, pattern] of HIGH_PATTERNS) {
    const match = html.match(pattern);
    if (match) {
      const value = parseDollar(match[1]);
      if (value > 0) {
        high = value;
        matched_patterns.push(name);
        break;
      }
    }
  }

  return { low, high, matched_patterns };
}

export function validateThresholdOrdering(low?: number, high?: number): string[] {
  const errors: string[] = [];
  if (!low) errors.push("low threshold missing");
  if (!high) errors.push("high threshold missing");
  if (low && high && high <= low) errors.push(`threshold ordering invalid: low=${low}, high=${high}`);
  return errors;
}
