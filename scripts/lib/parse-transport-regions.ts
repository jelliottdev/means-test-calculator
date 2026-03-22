import type { TransportationArtifact } from "../../src/datasets/types";
import { mergeMsaRows, type ParsedRegion, type ParsedMsa } from "./transport-geometry";
import { parseCells, parseDollar, tableRows } from "./html";

/**
 * Scaffold for parsing regional and MSA transportation operating-cost data.
 *
 * Current behavior:
 * - identifies candidate region headers
 * - identifies candidate MSA rows
 * - preserves parsed geographic structure for later validation
 * - does not yet publish guessed costs when extraction is ambiguous
 */
export function parseTransportationRegions(html: string): ParsedRegion[] {
  const regions: ParsedRegion[] = [];
  let current: ParsedRegion | null = null;

  for (const row of tableRows(html)) {
    const cells = parseCells(row, "both");
    if (cells.length === 0) continue;

    const first = cells[0].trim();
    if (/^(South|West|Midwest|Northeast)$/i.test(first)) {
      current = {
        name: first,
        states: [],
        msas: [],
      };
      regions.push(current);
      continue;
    }

    if (!current) continue;

    if (/regional/i.test(first) && cells.length >= 3) {
      const oneCar = parseDollar(cells[1]);
      const twoCar = parseDollar(cells[2]);
      if (oneCar > 0 && twoCar > 0) {
        current.regional = [oneCar, twoCar];
      }
      continue;
    }

    if (/msa|metropolitan|^\w.+,\s*[A-Z]{2}$/i.test(first) && cells.length >= 3) {
      const oneCar = parseDollar(cells[cells.length - 2]);
      const twoCar = parseDollar(cells[cells.length - 1]);
      const candidate: ParsedMsa = {
        name: first,
        state: "",
        counties: [],
        costs: oneCar > 0 && twoCar > 0 ? [oneCar, twoCar] : undefined,
      };
      current.msas.push(candidate);
    }
  }

  for (const region of regions) {
    region.msas = mergeMsaRows(region.msas);
  }

  return regions;
}

export function applyParsedRegions(
  transportation: TransportationArtifact,
  regions: ParsedRegion[]
): TransportationArtifact {
  const out = { ...transportation, regions: { ...transportation.regions } };
  for (const region of regions) {
    out.regions[region.name] = {
      states: region.states,
      regional: region.regional ?? [0, 0],
      msas: Object.fromEntries(
        region.msas.map((msa) => [msa.name, { counties: msa.state ? { [msa.state]: msa.counties } : {}, costs: msa.costs ?? [0, 0] }])
      ),
    };
  }
  return out;
}
