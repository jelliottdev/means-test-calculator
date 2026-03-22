import { parseCells } from "./html";

export type TransportRowRole =
  | "region_header"
  | "regional_cost"
  | "msa_header"
  | "county_membership"
  | "other";

export function classifyTransportRow(rowHtml: string): TransportRowRole {
  const text = parseCells(rowHtml, "both").join(" ").trim();
  if (!text) return "other";
  if (/^(South|West|Midwest|Northeast)$/i.test(text)) return "region_header";
  if (/regional/i.test(text)) return "regional_cost";
  if (/msa|metropolitan|micropolitan|division/i.test(text) || /,\s*[A-Z]{2}\b/.test(text)) return "msa_header";
  if (/(County|Parish|Borough|Census Area|Municipality)/.test(text)) return "county_membership";
  return "other";
}
