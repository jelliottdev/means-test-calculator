import type { TransportationArtifact } from "../../src/datasets/types";
import { extractRegionalCostRows, extractTransportSemanticBlocks } from "./transport-table-semantics";
import { extractAdjacentTransportMsaRows } from "./transport-adjacent-rows";

const FALLBACK_REGION_STATES: Record<string, string[]> = {
  South: ["AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV"],
  Midwest: ["IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI"],
  Northeast: ["CT","MA","ME","NH","NJ","NY","PA","RI","VT"],
  West: ["AK","AZ","CA","CO","HI","ID","MT","NM","NV","OR","UT","WA","WY"],
};

export function enrichTransportationWithRegionsV9(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const blocks = extractTransportSemanticBlocks(html);
  const regions: TransportationArtifact["regions"] = {};
  const warnings = [...(baseArtifact.warnings ?? [])];

  for (const block of blocks) {
    const regionalRows = extractRegionalCostRows(block.body);
    const regional: [number, number] = regionalRows.length > 0
      ? [regionalRows[0].one_car, regionalRows[0].two_car]
      : [0, 0];

    const adjacentMsas = extractAdjacentTransportMsaRows(block.body);

    regions[block.header] = {
      states: [...(FALLBACK_REGION_STATES[block.header] ?? [])],
      regional,
      msas: Object.fromEntries(
        adjacentMsas.map((msa) => [msa.label, {
          counties: msa.state ? { [msa.state]: msa.counties } : {},
          costs: msa.costs ?? [0, 0],
        }])
      ),
    };

    if (regionalRows.length === 0) warnings.push(`transport v9 found no semantic regional cost row for ${block.header}`);
    if (adjacentMsas.length === 0) warnings.push(`transport v9 found no adjacency-based MSA rows for ${block.header}`);
  }

  if (Object.keys(regions).length === 0) warnings.push("transport v9 extracted no semantic region blocks");

  return { ...baseArtifact, regions, warnings };
}
