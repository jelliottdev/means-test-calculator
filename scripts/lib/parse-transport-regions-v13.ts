import type { TransportationArtifact } from "../../src/datasets/types";
import { extractRegionalCostRows, extractTransportSemanticBlocks } from "./transport-table-semantics";
import { extractAdjacentTransportMsaRowsV4 } from "./transport-adjacent-rows-v4";
import { LONG_RANGE_ADJACENCY_POLICY_V2 } from "./adjacency-policy-v2";

const FALLBACK_REGION_STATES: Record<string, string[]> = {
  South: ["AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV"],
  Midwest: ["IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI"],
  Northeast: ["CT","MA","ME","NH","NJ","NY","PA","RI","VT"],
  West: ["AK","AZ","CA","CO","HI","ID","MT","NM","NV","OR","UT","WA","WY"],
};

export function enrichTransportationWithRegionsV13(
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

    const adjacentMsas = extractAdjacentTransportMsaRowsV4(block.body, LONG_RANGE_ADJACENCY_POLICY_V2);

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

    if (regionalRows.length === 0) warnings.push(`transport v13 found no semantic regional cost row for ${block.header}`);
    if (adjacentMsas.length === 0) warnings.push(`transport v13 found no implicit-stop adjacency MSA rows for ${block.header}`);
  }

  if (Object.keys(regions).length === 0) warnings.push("transport v13 extracted no semantic region blocks");

  return { ...baseArtifact, regions, warnings };
}
