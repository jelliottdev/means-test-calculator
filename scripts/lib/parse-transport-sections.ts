import { tableRows, parseCells } from "./html";

export interface TransportSection {
  title: string;
  rows: string[];
}

/**
 * Split the transportation HTML into coarse sections keyed by visible headers.
 * This helps isolate:
 * - ownership/public transit summary area
 * - regional operating cost blocks
 * - MSA/county blocks
 */
export function splitTransportSections(html: string): TransportSection[] {
  const sections: TransportSection[] = [];
  let current: TransportSection | null = null;

  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length === 0) continue;

    const joined = cells.join(" ").trim();
    if (!joined) continue;

    if (/^(South|West|Midwest|Northeast)$/i.test(joined) || /ownership|public transportation|operating costs/i.test(joined)) {
      current = { title: joined, rows: [row] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { title: "preamble", rows: [row] };
      sections.push(current);
      continue;
    }

    current.rows.push(row);
  }

  return sections;
}
