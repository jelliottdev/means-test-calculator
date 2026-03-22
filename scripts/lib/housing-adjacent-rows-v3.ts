import { tableRows, parseCells, parseDollar } from "./html";
import { classifyHousingRow } from "./housing-row-roles";
import { dedupeCounties } from "./geography";
import { DEFAULT_ADJACENCY_POLICY, type AdjacencyPolicy } from "./adjacency-policy";

export interface AdjacentHousingOverrideRowV3 {
  label: string;
  counties: string[];
  utility?: number;
  mortgage?: number;
}

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

export function extractAdjacentHousingOverrideRowsV3(
  html: string,
  policy: AdjacencyPolicy = DEFAULT_ADJACENCY_POLICY,
): AdjacentHousingOverrideRowV3[] {
  const rows = tableRows(html);
  const out: AdjacentHousingOverrideRowV3[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const role = classifyHousingRow(rows[i]);
    if (role !== "msa_header") continue;

    const headerText = parseCells(rows[i], "both").join(" ").trim();
    const record: AdjacentHousingOverrideRowV3 = {
      label: headerText,
      counties: [],
    };

    const headerNums = parseCells(rows[i], "both").map(parseDollar).filter((n) => n > 0);
    if (headerNums.length >= 2) {
      const plausibleUtilities = headerNums.filter((n) => n >= 150 && n <= 2000);
      const plausibleMortgage = headerNums.filter((n) => n >= 300 && n <= 5000);
      if (plausibleUtilities.length > 0) record.utility = Math.min(...plausibleUtilities);
      if (plausibleMortgage.length > 0) record.mortgage = Math.max(...plausibleMortgage);
    }

    for (let j = i + 1; j < Math.min(rows.length, i + 1 + policy.max_forward_rows); j += 1) {
      const nextRole = classifyHousingRow(rows[j]);
      const nextText = parseCells(rows[j], "both").join(" ").trim();
      if (!nextText) continue;
      if (policy.stop_on_header && nextRole === "msa_header") break;

      if (nextRole === "county_membership") {
        record.counties.push(...extractCountyTokens(nextText));
      }

      if (!record.utility || !record.mortgage) {
        const nums = parseCells(rows[j], "both").map(parseDollar).filter((n) => n > 0);
        const plausibleUtilities = nums.filter((n) => n >= 150 && n <= 2000);
        const plausibleMortgage = nums.filter((n) => n >= 300 && n <= 5000);
        if (!record.utility && plausibleUtilities.length > 0) record.utility = Math.min(...plausibleUtilities);
        if (!record.mortgage && plausibleMortgage.length > 0) record.mortgage = Math.max(...plausibleMortgage);
      }
    }

    record.counties = dedupeCounties(record.counties);
    out.push(record);
  }

  return out.filter((row) => row.counties.length > 0 || (!!row.utility && !!row.mortgage));
}
