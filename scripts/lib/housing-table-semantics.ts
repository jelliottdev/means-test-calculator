import { parseCells, parseDollar, tableRows } from "./html";

export interface HousingSemanticRow {
  label: string;
  utility?: number;
  mortgage?: number;
}

export function extractHousingSemanticRows(html: string): HousingSemanticRow[] {
  const out: HousingSemanticRow[] = [];
  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 3) continue;
    const label = cells[0].trim();
    if (!label) continue;

    const nums = cells.map(parseDollar).filter((n) => n > 0);
    if (nums.length < 2) continue;

    const plausibleUtilities = nums.filter((n) => n >= 150 && n <= 2000);
    const plausibleMortgage = nums.filter((n) => n >= 300 && n <= 5000);
    if (plausibleUtilities.length === 0 || plausibleMortgage.length === 0) continue;

    const utility = Math.min(...plausibleUtilities);
    const mortgage = Math.max(...plausibleMortgage);
    if (mortgage < utility) continue;

    out.push({ label, utility, mortgage });
  }
  return out;
}

export function extractHousingMsaLikeRows(html: string): HousingSemanticRow[] {
  return extractHousingSemanticRows(html).filter((row) => /msa|metropolitan|micropolitan|division/i.test(row.label));
}
