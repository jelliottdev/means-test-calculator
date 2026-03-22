import type { TransportationArtifact } from "../../src/datasets/types";
import { splitTransportSections } from "./parse-transport-sections";
import { extractStatesFromTransportBlock, extractMsaRowsFromTransportBlock } from "./parse-transport-state-msa";
import { mergeMsaRows } from "./transport-geometry";

export function enrichTransportationWithRegionsV3(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const sections = splitTransportSections(html);
  const regions: TransportationArtifact["regions"] = {};
  const warnings = [...(baseArtifact.warnings ?? [])];

  for (const section of sections) {
    if (!/^(South|West|Midwest|Northeast)$/i.test(section.title)) continue;

    const blockHtml = section.rows.join("\n");
    const states = extractStatesFromTransportBlock(blockHtml);
    const msas = mergeMsaRows(extractMsaRowsFromTransportBlock(blockHtml));

    const regionalRow = section.rows
      .map((row) => row.replace(/<[^>]+>/g, " "))
      .find((text) => /regional/i.test(text));

    let regional: [number, number] = [0, 0];
    if (regionalRow) {
      const nums = [...regionalRow.matchAll(/\$?([\d,]+)/g)].map((m) => parseInt(m[1].replace(/,/g, ""), 10)).filter((n) => n > 0);
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

    if (states.length === 0) warnings.push(`transport v3 extracted no states for region ${section.title}`);
    if (msas.length === 0) warnings.push(`transport v3 extracted no MSAs for region ${section.title}`);
  }

  if (Object.keys(regions).length === 0) {
    warnings.push("transport v3 extracted no region blocks");
  }

  return {
    ...baseArtifact,
    regions,
    warnings,
  };
}
