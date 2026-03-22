import type { MedianIncomeArtifact } from "../../src/datasets/types";
import { parseCells, parseDollar, tableRows } from "./html";

const STATE_ABBREVS: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR",
  California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI",
  Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME",
  Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE",
  Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH",
  Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX",
  Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

export function parseMedianIncomeArtifact(params: {
  html: string;
  sourceUrl: string;
  effectiveDate: string;
  coverageLabel: string;
  sourceHash?: string;
  fetchedAt?: string;
}): MedianIncomeArtifact {
  const medians: Record<string, [number, number, number, number]> = {};
  let incrementOver4 = 0;

  for (const row of tableRows(params.html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 5) continue;

    const stateName = cells[0].replace(/\*/g, "").trim();
    const abbr = STATE_ABBREVS[stateName];
    if (!abbr) continue;

    const values: [number, number, number, number] = [
      parseDollar(cells[1]),
      parseDollar(cells[2]),
      parseDollar(cells[3]),
      parseDollar(cells[4]),
    ];

    if (values.every((v) => v > 0)) {
      medians[abbr] = values;
    }
  }

  const incrementMatch = params.html.match(/\$?([\d,]+)\s*(?:per person|for each additional)/i);
  if (incrementMatch) {
    incrementOver4 = parseDollar(incrementMatch[1]);
  }

  const coverageCount = Object.keys(medians).length;
  if (coverageCount < 51) {
    throw new Error(`Median income parser incomplete: expected at least 51 jurisdictions, got ${coverageCount}`);
  }
  if (incrementOver4 <= 0) {
    throw new Error("Median income parser failed to detect household-size increment over 4");
  }

  return {
    kind: "median_income",
    effective_date: params.effectiveDate,
    source_url: params.sourceUrl,
    source_hash: params.sourceHash,
    fetched_at: params.fetchedAt,
    coverage: params.coverageLabel,
    increment_over_4: incrementOver4,
    data: medians,
  };
}
