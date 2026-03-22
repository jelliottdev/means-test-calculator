import type { TransportationArtifact } from "../../src/datasets/types";
import { parseCells, parseDollar, tableRows } from "./html";

/**
 * Strict parser for the DOJ/UST transportation page.
 *
 * This parser currently extracts the nationwide ownership/public transit values
 * from the official page and refuses publication if those values cannot be found.
 *
 * Regional and MSA operating-cost extraction is intentionally not guessed here.
 * Until that extraction is implemented and validated, the parser fails closed
 * unless the caller explicitly allows stubbed publication in a higher layer.
 */
export function parseTransportationArtifact(params: {
  html: string;
  sourceUrl: string;
  effectiveDate: string;
  sourceHash?: string;
  fetchedAt?: string;
}): TransportationArtifact {
  let ownership1Car = 0;
  let ownership2Car = 0;
  let publicTransport = 0;

  for (const row of tableRows(params.html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 2) continue;

    const label = cells[0].toLowerCase();
    const amount = parseDollar(cells[1]);
    if (amount <= 0) continue;

    if ((/ownership/i.test(label) && /one|1/.test(label) && /vehicle|car/.test(label)) || /one vehicle/i.test(label)) {
      ownership1Car = amount;
      continue;
    }
    if ((/ownership/i.test(label) && /two|2/.test(label) && /vehicle|car/.test(label)) || /two vehicles/i.test(label)) {
      ownership2Car = amount;
      continue;
    }
    if (/public\s+transit|public\s+transportation|no\s+vehicle/i.test(label)) {
      publicTransport = amount;
      continue;
    }
  }

  const missing: string[] = [];
  if (!ownership1Car) missing.push("ownership_1_car");
  if (!ownership2Car) missing.push("ownership_2_car");
  if (!publicTransport) missing.push("public_transport");

  if (missing.length > 0) {
    throw new Error(`Transportation parser incomplete: missing ${missing.join(", ")}`);
  }

  return {
    kind: "transportation",
    effective_date: params.effectiveDate,
    source_url: params.sourceUrl,
    source_hash: params.sourceHash,
    fetched_at: params.fetchedAt,
    coverage: "national ownership/public transit extracted; regional/MSA extraction pending",
    warnings: ["Regional and MSA operating-cost extraction is not implemented yet."],
    ownership_1_car: ownership1Car,
    ownership_2_car: ownership2Car,
    public_transport: publicTransport,
    regions: {},
  };
}
