import { tableRows, parseCells, parseDollar } from "./html";
import { classifyTransportRow } from "./transport-row-roles";
import { dedupeCounties } from "./geography";
import { BALANCED_ADJACENCY_POLICY_V3, type AdjacencyPolicyV3 } from "./adjacency-policy-v3";
import { looksLikeImplicitTransportStop } from "./implicit-stop-conditions";

export interface AdjacentTransportMsaRowV5 {
  label: string;
  state?: string;
  counties: string[];
  costs?: [number, number];
}

function extractCountyTokens(text: string): string[] {
  return [...text.matchAll(/([A-Za-z .'-]+?)\s+(?:County|Parish|Borough|Census Area|Municipality)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

function extractState(text: string): string | undefined {
  const m = text.match(/,\s*([A-Z]{2})\b/);
  return m ? m[1] : undefined;
}

export function extractAdjacentTransportMsaRowsV5(
  html: string,
  policy: AdjacencyPolicyV3 = BALANCED_ADJACENCY_POLICY_V3,
): AdjacentTransportMsaRowV5[] {
  const rows = tableRows(html);
  const out: AdjacentTransportMsaRowV5[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const role = classifyTransportRow(rows[i]);
    if (role !== "msa_header") continue;

    const headerText = parseCells(rows[i], "both").join(" ").trim();
    const record: AdjacentTransportMsaRowV5 = {
      label: headerText,
      state: extractState(headerText),
      counties: [],
    };

    for (let j = i + 1; j < Math.min(rows.length, i + 1 + policy.max_forward_rows); j += 1) {
      const nextRole = classifyTransportRow(rows[j]);
      const nextText = parseCells(rows[j], "both").join(" ").trim();
      if (!nextText) continue;
      if (policy.stop_on_header && nextRole === "msa_header") break;
      if (policy.stop_on_region_header && nextRole === "region_header") break;
      if (policy.stop_on_implicit_header && looksLikeImplicitTransportStop(nextText) && nextRole !== "county_membership") break;

      if (nextRole === "county_membership") {
        record.counties.push(...extractCountyTokens(nextText));
      }

      const nums = parseCells(rows[j], "both").map(parseDollar).filter((n) => n > 0);
      if (!record.costs && nums.length >= 2) {
        record.costs = [nums[nums.length - 2], nums[nums.length - 1]];
      }
    }

    record.counties = dedupeCounties(record.counties);
    out.push(record);
  }

  return out.filter((row) => row.counties.length > 0 || !!row.costs);
}
