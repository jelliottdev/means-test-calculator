import { parseCells, parseDollar, tableRows } from "./html";
import { dedupeCounties } from "./geography";
import type { ParsedMsa } from "./transport-geometry";

const STATE_CODE_RE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g;

export function extractStatesFromTransportBlock(html: string): string[] {
  const states = new Set<string>();
  for (const row of tableRows(html)) {
    const text = parseCells(row, "both").join(" ");
    for (const match of text.matchAll(STATE_CODE_RE)) {
      states.add(match[1]);
    }
  }
  return [...states];
}

export function extractMsaRowsFromTransportBlock(html: string): ParsedMsa[] {
  const rows: ParsedMsa[] = [];
  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 2) continue;
    const label = cells[0].trim();
    if (!/msa|metropolitan|micropolitan|,\s*[A-Z]{2}$/i.test(label)) continue;

    const stateMatch = label.match(/,\s*([A-Z]{2})\b/);
    const state = stateMatch ? stateMatch[1] : "";
    const countyMatches = [...label.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area)/g)].map((m) => m[1].trim());
    const numeric = cells.map(parseDollar).filter((n) => n > 0);
    const costs = numeric.length >= 2 ? [numeric[numeric.length - 2], numeric[numeric.length - 1]] as [number, number] : undefined;

    rows.push({
      name: label,
      state,
      counties: dedupeCounties(countyMatches),
      costs,
    });
  }
  return rows;
}
