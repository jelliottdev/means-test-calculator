import { parseCells, parseDollar, tableRows } from "./html";
import { dedupeCounties } from "./geography";

export interface HousingMembershipRow {
  label: string;
  counties: string[];
  utility?: number;
  mortgage?: number;
}

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

export function extractHousingMembershipRows(html: string): HousingMembershipRow[] {
  const out: HousingMembershipRow[] = [];
  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 3) continue;
    const label = cells[0].trim();
    if (!label || !/msa|metropolitan|micropolitan|division/i.test(label)) continue;

    const counties = dedupeCounties(extractCountyTokens(label));
    const nums = cells.map(parseDollar).filter((n) => n > 0);
    const plausibleUtilities = nums.filter((n) => n >= 150 && n <= 2000);
    const plausibleMortgage = nums.filter((n) => n >= 300 && n <= 5000);
    const utility = plausibleUtilities.length > 0 ? Math.min(...plausibleUtilities) : undefined;
    const mortgage = plausibleMortgage.length > 0 ? Math.max(...plausibleMortgage) : undefined;

    out.push({ label, counties, utility, mortgage });
  }
  return out;
}
