import { dedupeCounties, normalizeCountyName } from "./geography";

export interface ParsedMsa {
  name: string;
  state: string;
  counties: string[];
  costs?: [number, number];
}

export interface ParsedRegion {
  name: string;
  states: string[];
  regional?: [number, number];
  msas: ParsedMsa[];
}

export function normalizeMsaName(input: string): string {
  return input
    .replace(/\s+msa$/i, "")
    .replace(/\s+metropolitan\s+statistical\s+area$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeMsaRows(rows: ParsedMsa[]): ParsedMsa[] {
  const grouped = new Map<string, ParsedMsa>();
  for (const row of rows) {
    const key = `${normalizeMsaName(row.name).toLowerCase()}::${row.state}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        name: normalizeMsaName(row.name),
        state: row.state,
        counties: dedupeCounties(row.counties),
        costs: row.costs,
      });
      continue;
    }
    existing.counties = dedupeCounties([...existing.counties, ...row.counties]);
    if (!existing.costs && row.costs) existing.costs = row.costs;
  }
  return [...grouped.values()];
}

export function countyInMsa(county: string, msa: ParsedMsa): boolean {
  const normalized = normalizeCountyName(county);
  return msa.counties.some((c) => normalizeCountyName(c) === normalized);
}
