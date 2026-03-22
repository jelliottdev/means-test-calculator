import type { TransportationArtifact } from "../../src/datasets/types";
import { extractStatesFromTransportBlock, extractMsaRowsFromTransportBlock } from "./parse-transport-state-msa";
import { extractDirectTransportMsaMembership } from "./parse-transport-msa-direct";
import { mergeMsaRows } from "./transport-geometry";
import { extractRegionalCostRows, extractTransportSemanticBlocks } from "./transport-table-semantics";
import { extractTransportMembershipRows } from "./transport-membership-semantics";

const FALLBACK_REGION_STATES: Record<string, string[]> = {
  South: ["AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV"],
  Midwest: ["IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI"],
  Northeast: ["CT","MA","ME","NH","NJ","NY","PA","RI","VT"],
  West: ["AK","AZ","CA","CO","HI","ID","MT","NM","NV","OR","UT","WA","WY"],
};

export function enrichTransportationWithRegionsV7(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const blocks = extractTransportSemanticBlocks(html);
  const regions: TransportationArtifact["regions"] = {};
  const warnings = [...(baseArtifact.warnings ?? [])];

  for (const block of blocks) {
    const extractedStates = extractStatesFromTransportBlock(block.body);
    const states = extractedStates.length > 0 ? extractedStates : (FALLBACK_REGION_STATES[block.header] ?? []);

    const membershipRows = extractTransportMembershipRows(block.body);
    const directMsas = extractDirectTransportMsaMembership(block.body);
    const fallbackMsas = extractMsaRowsFromTransportBlock(block.body);
    const msas = mergeMsaRows(
      membershipRows.length > 0
        ? membershipRows.map((row) => ({ name: row.msa_label, state: row.state ?? "", counties: row.counties }))
        : directMsas.length > 0
          ? directMsas
          : fallbackMsas
    );

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

    if (extractedStates.length === 0) warnings.push(`transport v7 used fallback state map for region ${block.header}`);
    if (regionalRows.length === 0) warnings.push(`transport v7 found no semantic regional cost row for ${block.header}`);
    if (membershipRows.length === 0 && directMsas.length === 0 && fallbackMsas.length === 0) warnings.push(`transport v7 extracted no MSAs for region ${block.header}`);
    if (membershipRows.length === 0 && (directMsas.length > 0 || fallbackMsas.length > 0)) warnings.push(`transport v7 did not find membership rows for region ${block.header}`);
  }

  if (Object.keys(regions).length === 0) warnings.push("transport v7 extracted no semantic region blocks");

  return {
    ...baseArtifact,
    regions,
    warnings,
  };
}
