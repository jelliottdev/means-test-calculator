import type { TransportationArtifact } from "../../src/datasets/types";
import { extractStatesFromTransportBlock, extractMsaRowsFromTransportBlock } from "./parse-transport-state-msa";
import { extractDirectTransportMsaMembership } from "./parse-transport-msa-direct";
import { mergeMsaRows } from "./transport-geometry";
import { extractRegionalCostRows, extractTransportSemanticBlocks } from "./transport-table-semantics";

const FALLBACK_REGION_STATES: Record<string, string[]> = {
  South: ["AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV"],
  Midwest: ["IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI"],
  Northeast: ["CT","MA","ME","NH","NJ","NY","PA","RI","VT"],
  West: ["AK","AZ","CA","CO","HI","ID","MT","NM","NV","OR","UT","WA","WY"],
};

export function enrichTransportationWithRegionsV6(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const blocks = extractTransportSemanticBlocks(html);
  const regions: TransportationArtifact["regions"] = {};
  const warnings = [...(baseArtifact.warnings ?? [])];

  for (const block of blocks) {
    const extractedStates = extractStatesFromTransportBlock(block.body);
    const states = extractedStates.length > 0 ? extractedStates : (FALLBACK_REGION_STATES[block.header] ?? []);
    const directMsas = extractDirectTransportMsaMembership(block.body);
    const fallbackMsas = extractMsaRowsFromTransportBlock(block.body);
    const msas = mergeMsaRows(directMsas.length > 0 ? directMsas : fallbackMsas);
    const regionalRows = extractRegionalCostRows(block.body);
    const regional: [number, number] = regionalRows.length > 0
      ? [regionalRows[0].one_car, regionalRows[0].two_car]
      : [0, 0];

    regions[block.header] = {
      states,
      regional,
      msas: Object.fromEntries(
        msas.map((msa) => [msa.name, {
          counties: msa.state ? { [msa.state]: msa.counties } : {},
          costs: msa.costs ?? [0, 0],
        }])
      ),
    };

    if (extractedStates.length === 0) warnings.push(`transport v6 used fallback state map for region ${block.header}`);
    if (regionalRows.length === 0) warnings.push(`transport v6 found no semantic regional cost row for ${block.header}`);
    if (directMsas.length === 0 && fallbackMsas.length > 0) warnings.push(`transport v6 used fallback MSA extraction for region ${block.header}`);
    if (directMsas.length === 0 && fallbackMsas.length === 0) warnings.push(`transport v6 extracted no MSAs for region ${block.header}`);
  }

  if (Object.keys(regions).length === 0) warnings.push("transport v6 extracted no semantic region blocks");

  return {
    ...baseArtifact,
    regions,
    warnings,
  };
}
