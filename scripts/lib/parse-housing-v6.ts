import type { HousingArtifact } from "../../src/datasets/types";
import { createHousingCountyModel, addHousingCountyRecord, countHousingCounties } from "./housing-county-model";
import { dedupeCounties } from "./geography";
import { parseCells, parseDollar, tableRows } from "./html";
import { deriveHousingMsaOverridesDirect } from "./parse-housing-msa-direct";
import { extractDirectHousingMsaRows } from "./parse-housing-msa-direct-rows";
import { extractHousingMsaLikeRows } from "./housing-table-semantics";

function scaleHousehold(base: number): [number, number, number, number, number] {
  return [
    base,
    Math.round(base * 1.17),
    Math.round(base * 1.31),
    Math.round(base * 1.44),
    Math.round(base * 1.56),
  ];
}

export function parseHousingArtifactV6(params: {
  htmlByState: Record<string, string>;
  sourceBaseUrl: string;
  effectiveDate: string;
  fetchedAt?: string;
  sourceHashByState?: Record<string, string>;
}): HousingArtifact {
  const model = createHousingCountyModel();
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

      const first = cells[0].trim();
      const firstLower = first.toLowerCase();
      if (!first || /county|area|jurisdiction|non.?mortgage|mortgage|rental|utility/i.test(firstLower)) continue;

      const numericCells = cells.map(parseDollar).filter((n) => n > 0);
      if (numericCells.length < 2) continue;

      const plausibleUtilities = numericCells.filter((n) => n >= 150 && n <= 2000);
      const plausibleMortgage = numericCells.filter((n) => n >= 300 && n <= 5000);
      if (plausibleUtilities.length === 0 || plausibleMortgage.length === 0) continue;

      const utility = Math.min(...plausibleUtilities);
      const mortgage = Math.max(...plausibleMortgage);
      if (mortgage < utility) continue;

      addHousingCountyRecord(model, {
        state,
        county: first,
        utility,
        mortgage,
        source_page: `${params.sourceBaseUrl}${state.toLowerCase()}.htm`,
        source_hash: params.sourceHashByState?.[state],
      });

      totalUtility += utility;
      totalMortgage += mortgage;
      count += 1;
      countyNames.push(first);
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
      warnings.push(`housing v6 coverage too low for ${state}`);
    }

    const deduped = dedupeCounties(countyNames);
    if (deduped.length > 0 && deduped.length < countyNames.length) {
      warnings.push(`housing v6 parser deduped repeated counties for ${state}`);
    }

    const countyCount = countHousingCounties(model, state);
    if (countyCount > 0 && countyCount < 3) {
      warnings.push(`housing v6 retained only ${countyCount} county rows for ${state}`);
    }
  }

  if (parsedStates < 40) {
    throw new Error(`Housing parser v6 incomplete: expected at least 40 states parsed, got ${parsedStates}`);
  }

  const semanticRowCount = Object.values(params.htmlByState).reduce((sum, html) => sum + extractHousingMsaLikeRows(html).length, 0);
  const directOverrides = extractDirectHousingMsaRows(params.htmlByState);
  const derivedOverrides = deriveHousingMsaOverridesDirect(model, stateDefaults);
  const msaOverrides = directOverrides.length > 0 ? directOverrides : derivedOverrides;

  if (semanticRowCount === 0) warnings.push("housing v6 found no semantic MSA-like rows");
  if (directOverrides.length === 0 && derivedOverrides.length > 0) warnings.push("housing v6 used derived overrides because semantic/direct rows did not yield overrides");
  if (msaOverrides.length === 0) warnings.push("housing v6 produced no MSA overrides");

  return {
    kind: "housing",
    effective_date: params.effectiveDate,
    source_url: params.sourceBaseUrl,
    fetched_at: params.fetchedAt,
    coverage: `state defaults derived from retained county rows across ${parsedStates} states; total counties retained=${countHousingCounties(model)}; semantic_msa_rows=${semanticRowCount}; overrides=${msaOverrides.length}`,
    warnings,
    state_defaults: stateDefaults,
    msa_overrides: msaOverrides,
  };
}
