import { parseCells, parseDollar, tableRows } from "./html";

export interface RegionalCostRow {
  label: string;
  one_car: number;
  two_car: number;
}

export function extractRegionalCostRows(html: string): RegionalCostRow[] {
  const rows: RegionalCostRow[] = [];
  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 3) continue;
    const label = cells[0].trim();
    if (!/regional/i.test(label)) continue;
    const nums = cells.map(parseDollar).filter((n) => n > 0);
    if (nums.length < 2) continue;
    rows.push({
      label,
      one_car: nums[nums.length - 2],
      two_car: nums[nums.length - 1],
    });
  }
  return rows;
}

export function extractTransportSemanticBlocks(html: string): Array<{ header: string; body: string }> {
  const out: Array<{ header: string; body: string }> = [];
  let currentHeader = "";
  let currentBody: string[] = [];

  for (const row of tableRows(html)) {
    const text = parseCells(row, "both").join(" ").trim();
    if (!text) continue;
    if (/^(South|West|Midwest|Northeast)$/i.test(text)) {
      if (currentHeader) out.push({ header: currentHeader, body: currentBody.join("\n") });
      currentHeader = text;
      currentBody = [row];
      continue;
    }
    currentBody.push(row);
  }

  if (currentHeader) out.push({ header: currentHeader, body: currentBody.join("\n") });
  return out;
}
