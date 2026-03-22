export function normalizeCountyName(input: string): string {
  return input
    .toLowerCase()
    .replace(/\bcounty\b/g, "")
    .replace(/\bparish\b/g, "")
    .replace(/\bborough\b/g, "")
    .replace(/\bcensus area\b/g, "")
    .replace(/\bmunicipality\b/g, "")
    .replace(/\bcity and borough\b/g, "")
    .replace(/\bciudad\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countyEquals(a: string, b: string): boolean {
  return normalizeCountyName(a) === normalizeCountyName(b);
}

export function dedupeCounties(counties: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const county of counties) {
    const normalized = normalizeCountyName(county);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(county.trim());
  }
  return out;
}
