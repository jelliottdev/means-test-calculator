import { parseCells, tableRows } from "./html";
import { dedupeCounties } from "./geography";
import type { ParsedMsa } from "./transport-geometry";

const STATE_CODE_RE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

/**
 * Parse rows where DOJ/UST transport pages list an MSA title followed by one or more
 * county-membership rows. This is intentionally conservative and only captures counties
 * when they appear explicitly in nearby rows.
 */
export function extractDirectTransportMsaMembership(html: string): ParsedMsa[] {
  const rows = tableRows(html);
  const results: ParsedMsa[] = [];
  let current: ParsedMsa | null = null;

  for (const row of rows) {
    const cells = parseCells(row, "both");
    if (cells.length === 0) continue;
    const text = cells.join(" ").trim();
    if (!text) continue;

    const msaHeader = /msa|metropolitan|micropolitan|division/i.test(text) || /,\s*[A-Z]{2}\b/.test(text);
    if (msaHeader) {
      const stateMatch = text.match(STATE_CODE_RE);
      current = {
        name: text,
        state: stateMatch ? stateMatch[1] : "",
        counties: [],
      };
      results.push(current);
      continue;
    }

    if (!current) continue;

    const countyTokens = extractCountyTokens(text);
    if (countyTokens.length > 0) {
      current.counties = dedupeCounties([...current.counties, ...countyTokens]);
      continue;
    }

    // terminate current block on obvious unrelated headers/rows
    if (/^(South|West|Midwest|Northeast)$/i.test(text) || /regional/i.test(text)) {
      current = null;
    }
  }

  return results.filter((msa) => msa.counties.length > 0);
}
