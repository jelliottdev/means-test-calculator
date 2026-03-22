import type { TransportationArtifact } from "../../src/datasets/types";
import { splitTransportSections } from "./parse-transport-sections";
import { parseTransportationRegions, applyParsedRegions } from "./parse-transport-regions";

/**
 * V2 transport regional/MSA parser.
 *
 * Uses coarse HTML section splitting first, then feeds likely region/MSA blocks into
 * the region parser scaffold. This keeps extraction conservative while moving the
 * pipeline closer to true regional/MSA coverage.
 */
export function enrichTransportationWithRegionsV2(
  html: string,
  baseArtifact: TransportationArtifact,
): TransportationArtifact {
  const sections = splitTransportSections(html);
  const regionLikeHtml = sections
    .filter((section) => /^(South|West|Midwest|Northeast)$/i.test(section.title) || /operating costs/i.test(section.title))
    .map((section) => section.rows.join("\n"))
    .join("\n");

  if (!regionLikeHtml.trim()) {
    return {
      ...baseArtifact,
      warnings: [...(baseArtifact.warnings ?? []), "transport v2 parser found no region-like sections"],
    };
  }

  const parsed = parseTransportationRegions(regionLikeHtml);
  const enriched = applyParsedRegions(baseArtifact, parsed);

  const parsedRegionCount = Object.keys(enriched.regions).length;
  const warnings = [...(enriched.warnings ?? [])];
  if (parsedRegionCount === 0) {
    warnings.push("transport v2 parser did not extract any regional/MSA coverage");
  } else if (parsedRegionCount < 4) {
    warnings.push(`transport v2 parser extracted only ${parsedRegionCount} region blocks`);
  }

  return {
    ...enriched,
    warnings,
  };
}
