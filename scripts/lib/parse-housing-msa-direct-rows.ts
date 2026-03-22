import { parseCells, parseDollar, tableRows } from "./html";
import { dedupeCounties } from "./geography";
import type { HousingArtifact } from "../../src/datasets/types";

function scaleHousehold(base: number): [number, number, number, number, number] {
  return [
    base,
    Math.round(base * 1.17),
    Math.round(base * 1.31),
    Math.round(base * 1.44),
    Math.round(base * 1.56),
  ];
}

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

/**
 * Conservative direct extraction from housing pages when an MSA-like row lists
 * multiple counties explicitly.
 */
export function extractDirectHousingMsaRows(
  htmlByState: Record<string, string>,
): NonNullable<HousingArtifact["msa_overrides"]> {
  const overrides: NonNullable<HousingArtifact["msa_overrides"]> = [];

  for (const [state, html] of Object.entries(htmlByState)) {
    for (const row of tableRows(html)) {
      const cells = parseCells(row, "both");
      if (cells.length < 3) continue;
      const label = cells[0].trim();
      if (!/msa|metropolitan|micropolitan|division/i.test(label)) continue;

      const counties = dedupeCounties(extractCountyTokens(label));
      if (counties.length < 2) continue;

      const nums = cells.map(parseDollar).filter((n) => n > 0);
      if (nums.length < 2) continue;
      const utility = Math.min(...nums.filter((n) => n >= 150 && n <= 2000));
      const mortgage = Math.max(...nums.filter((n) => n >= 300 && n <= 5000));
      if (!utility || !mortgage || mortgage < utility) continue;

      overrides.push({
        name: label,
        counties: { [state]: counties },
        utility: scaleHousehold(utility),
        mortgage: scaleHousehold(mortgage),
      });
    }
  }

  return overrides;
}
