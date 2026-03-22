import { dedupeCounties, normalizeCountyName } from "./geography";

export interface ParsedHousingCountyRow {
  state: string;
  county: string;
  utility: number;
  mortgage: number;
}

export interface ParsedHousingStateCoverage {
  state: string;
  counties: ParsedHousingCountyRow[];
}

export function dedupeHousingRows(rows: ParsedHousingCountyRow[]): ParsedHousingCountyRow[] {
  const grouped = new Map<string, ParsedHousingCountyRow>();
  for (const row of rows) {
    const key = `${row.state}::${normalizeCountyName(row.county)}`;
    if (!grouped.has(key)) {
      grouped.set(key, { ...row, county: row.county.trim() });
    }
  }
  return [...grouped.values()];
}

export function summarizeStateCoverage(state: string, rows: ParsedHousingCountyRow[]): ParsedHousingStateCoverage {
  return {
    state,
    counties: dedupeHousingRows(rows),
  };
}

export function countyCoverageCount(rows: ParsedHousingCountyRow[]): number {
  return dedupeCounties(rows.map((r) => r.county)).length;
}
