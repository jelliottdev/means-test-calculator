import type { HousingArtifact } from "../../src/datasets/types";
import { dedupeCounties } from "./geography";
import { parseCells, parseDollar, tableRows } from "./html";

function scaleHousehold(base: number): [number, number, number, number, number] {
  return [
    base,
    Math.round(base * 1.17),
    Math.round(base * 1.31),
    Math.round(base * 1.44),
    Math.round(base * 1.56),
  ];
}

/**
 * Strict housing parser skeleton.
 *
 * Goal:
 * - parse authoritative county/state housing chart rows
 * - derive state defaults only from successfully parsed rows
 * - never silently invent county coverage
 *
 * Current implementation:
 * - extracts candidate county rows using conservative validation bounds
 * - computes state defaults from parsed rows when possible
 * - intentionally does not attempt MSA override synthesis yet
 * - fails closed if coverage is too low
 */
export function parseHousingArtifact(params: {
  htmlByState: Record<string, string>;
  sourceBaseUrl: string;
  effectiveDate: string;
  fetchedAt?: string;
}): HousingArtifact {
  const stateDefaults: HousingArtifact["state_defaults"] = {};
  const warnings: string[] = [];
  let parsedStates = 0;

  for (const [state, html] of Object.entries(params.htmlByState)) {
    const rows = tableRows(html);
    let totalUtility = 0;
    let totalMortgage = 0;
    let count = 0;
    const countyNames: string[] = [];

    for (const row of rows) {
      const cells = parseCells(row, "both");
      if (cells.length < 3) continue;

      const first = cells[0].toLowerCase();
      if (/county|area|jurisdiction|non.?mortgage|mortgage|rental|utility/i.test(first)) continue;

      const numericCells = cells.map(parseDollar).filter((n) => n > 0);
      if (numericCells.length < 2) continue;

      // Conservative heuristic: pick the smallest plausible utility and largest plausible mortgage/rent
      const plausibleUtilities = numericCells.filter((n) => n >= 150 && n <= 2000);
      const plausibleMortgage = numericCells.filter((n) => n >= 300 && n <= 5000);
      if (plausibleUtilities.length === 0 || plausibleMortgage.length === 0) continue;

      const utility = Math.min(...plausibleUtilities);
      const mortgage = Math.max(...plausibleMortgage);
      if (mortgage < utility) continue;

      totalUtility += utility;
      totalMortgage += mortgage;
      count += 1;
      countyNames.push(cells[0]);
    }

    if (count >= 3) {
      const avgUtility = Math.round(totalUtility / count);
      const avgMortgage = Math.round(totalMortgage / count);
      stateDefaults[state] = {
        utility: scaleHousehold(avgUtility),
        mortgage: scaleHousehold(avgMortgage),
      };
      parsedStates += 1;
    } else {
      warnings.push(`housing coverage too low for ${state}`);
    }

    const deduped = dedupeCounties(countyNames);
    if (deduped.length > 0 && deduped.length < countyNames.length) {
      warnings.push(`housing parser deduped repeated counties for ${state}`);
    }
  }

  if (parsedStates < 40) {
    throw new Error(`Housing parser incomplete: expected at least 40 states parsed, got ${parsedStates}`);
  }

  return {
    kind: "housing",
    effective_date: params.effectiveDate,
    source_url: params.sourceBaseUrl,
    fetched_at: params.fetchedAt,
    coverage: `state defaults derived from parsed county rows across ${parsedStates} states`,
    warnings,
    state_defaults: stateDefaults,
    msa_overrides: [],
  };
}
