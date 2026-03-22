import type { TransportationArtifact } from "../../src/datasets/types";
import { tableRows, parseCells } from "./html";
import { classifyTransportRow } from "./transport-row-roles";
import { dedupeCounties } from "./geography";
import { extractRegionalCostRows, extractTransportSemanticBlocks } from "./transport-table-semantics";

const FALLBACK_REGION_STATES: Record<string, string[]> = {
  South: ["AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV"],
  Midwest: ["IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI"],
  Northeast: ["CT","MA","ME","NH","NJ","NY","PA","RI","VT"],
  West: ["AK","AZ","CA","CO","HI","ID","MT","NM","NV","OR","UT","WA","WY"],
};

function extractState(text: string): string {
  const m = text.match(/,\s*([A-Z]{2})\b/);
  return m ? m[1] : "";
}

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

export function enrichTransportationWithRegionsV8(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const blocks = extractTransportSemanticBlocks(html);
  const regions: TransportationArtifact["regions"] = {};
  const warnings = [...(baseArtifact.warnings ?? [])];

  for (const block of blocks) {
    const rows = tableRows(block.body);
    const regionStates = [...(FALLBACK_REGION_STATES[block.header] ?? [])];
    const regionalRows = extractRegionalCostRows(block.body);
    const regional: [number, number] = regionalRows.length > 0
      ? [regionalRows[0].one_car, regionalRows[0].two_car]
      : [0, 0];

    const msas: Array<{ name: string; state: string; counties: string[] }> = [];
    let current: { name: string; state: string; counties: string[] } | null = null;

    for (const row of rows) {
      const role = classifyTransportRow(row);
      const text = parseCells(row, "both").join(" ").trim();
      if (!text) continue;

      if (role === "msa_header") {
        if (current) msas.push({ ...current, counties: dedupeCounties(current.counties) });
        current = { name: text, state: extractState(text), counties: [] };
      } else if (role === "county_membership") {
        if (current) current.counties.push(...extractCountyTokens(text));
      } else if (role === "region_header" || role === "regional_cost") {
        // ignore, region handled separately
      }
    }
    if (current) msas.push({ ...current, counties: dedupeCounties(current.counties) });

    regions[block.header] = {
      states: regionStates,
      regional,
      msas: Object.fromEntries(
        msas.map((msa) => [msa.name, {
          counties: msa.state ? { [msa.state]: msa.counties } : {},
          costs: [0, 0] as [number, number],
        }])
      ),
    };

    if (regionalRows.length === 0) warnings.push(`transport v8 found no semantic regional cost row for ${block.header}`);
    if (msas.length === 0) warnings.push(`transport v8 found no role-based MSA rows for ${block.header}`);
  }

  if (Object.keys(regions).length === 0) warnings.push("transport v8 extracted no semantic region blocks");

  return { ...baseArtifact, regions, warnings };
}
