import { parseCells, tableRows } from "./html";
import { dedupeCounties } from "./geography";

export interface TransportMembershipRow {
  msa_label: string;
  counties: string[];
  state?: string;
}

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

export function extractTransportMembershipRows(html: string): TransportMembershipRow[] {
  const out: TransportMembershipRow[] = [];
  let currentLabel = "";
  let currentState: string | undefined;
  let currentCounties: string[] = [];

  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length === 0) continue;
    const text = cells.join(" ").trim();
    if (!text) continue;

    const isHeader = /msa|metropolitan|micropolitan|division/i.test(text) || /,\s*[A-Z]{2}\b/.test(text);
    if (isHeader) {
      if (currentLabel) {
        out.push({ msa_label: currentLabel, counties: dedupeCounties(currentCounties), state: currentState });
      }
      currentLabel = text;
      currentCounties = [];
      const stateMatch = text.match(/,\s*([A-Z]{2})\b/);
      currentState = stateMatch ? stateMatch[1] : undefined;
      continue;
    }

    const counties = extractCountyTokens(text);
    if (counties.length > 0) {
      currentCounties.push(...counties);
      continue;
    }

    if (/^(South|West|Midwest|Northeast)$/i.test(text) || /regional/i.test(text)) {
      if (currentLabel) {
        out.push({ msa_label: currentLabel, counties: dedupeCounties(currentCounties), state: currentState });
      }
      currentLabel = "";
      currentCounties = [];
      currentState = undefined;
    }
  }

  if (currentLabel) {
    out.push({ msa_label: currentLabel, counties: dedupeCounties(currentCounties), state: currentState });
  }

  return out.filter((row) => row.counties.length > 0);
}
