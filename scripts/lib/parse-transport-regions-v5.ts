import type { TransportationArtifact } from "../../src/datasets/types";
import { splitTransportSections } from "./parse-transport-sections";
import { extractStatesFromTransportBlock, extractMsaRowsFromTransportBlock } from "./parse-transport-state-msa";
import { extractDirectTransportMsaMembership } from "./parse-transport-msa-direct";
import { mergeMsaRows } from "./transport-geometry";

const FALLBACK_REGION_STATES: Record<string, string[]> = {
  South: ["AL","AR","DC","DE","FL","GA","KY","LA","MD","MS","NC","OK","SC","TN","TX","VA","WV"],
  Midwest: ["IA","IL","IN","KS","MI","MN","MO","ND","NE","OH","SD","WI"],
  Northeast: ["CT","MA","ME","NH","NJ","NY","PA","RI","VT"],
  West: ["AK","AZ","CA","CO","HI","ID","MT","NM","NV","OR","UT","WA","WY"],
};

export function enrichTransportationWithRegionsV5(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const sections = splitTransportSections(html);
  const regions: TransportationArtifact["regions"] = {};
  const warnings = [...(baseArtifact.warnings ?? [])];

  for (const section of sections) {
    if (!/^(South|West|Midwest|Northeast)$/i.test(section.title)) continue;

    const blockHtml = section.rows.join("\n");
    const extractedStates = extractStatesFromTransportBlock(blockHtml);
    const states = extractedStates.length > 0 ? extractedStates : (FALLBACK_REGION_STATES[section.title] ?? []);

    const directMsas = extractDirectTransportMsaMembership(blockHtml);
    const fallbackMsas = extractMsaRowsFromTransportBlock(blockHtml);
    const msas = mergeMsaRows(directMsas.length > 0 ? directMsas : fallbackMsas);

    const regionalRow = section.rows
      .map((row) => row.replace(/<[^>]+>/g, " "))
      .find((text) => /regional/i.test(text));

    let regional: [number, number] = [0, 0];
    if (regionalRow) {
      const nums = [...regionalRow.matchAll(/\$?([\d,]+)/g)]
        .map((m) => parseInt(m[1].replace(/,/g, ""), 10))
        .filter((n) => n > 0);
      if (nums.length >= 2) regional = [nums[nums.length - 2], nums[nums.length - 1]];
    }

    regions[section.title] = {
      states,
      regional,
      msas: Object.fromEntries(
        msas.map((msa) => [msa.name, {
          counties: msa.state ? { [msa.state]: msa.counties } : {},
          costs: msa.costs ?? [0, 0],
        }])
      ),
    };

    if (extractedStates.length === 0) warnings.push(`transport v5 used fallback state map for region ${section.title}`);
    if (directMsas.length === 0 && fallbackMsas.length === 0) warnings.push(`transport v5 extracted no MSAs for region ${section.title}`);
    if (directMsas.length === 0 && fallbackMsas.length > 0) warnings.push(`transport v5 used fallback MSA extraction for region ${section.title}`);
  }

  if (Object.keys(regions).length === 0) warnings.push("transport v5 extracted no region blocks");

  return {
    ...baseArtifact,
    regions,
    warnings,
  };
}
