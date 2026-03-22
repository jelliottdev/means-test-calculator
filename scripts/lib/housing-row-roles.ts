import { parseCells } from "./html";

export type HousingRowRole =
  | "msa_header"
  | "county_membership"
  | "statewide_default"
  | "other";

export function classifyHousingRow(rowHtml: string): HousingRowRole {
  const text = parseCells(rowHtml, "both").join(" ").trim();
  if (!text) return "other";
  if (/msa|metropolitan|micropolitan|division/i.test(text)) return "msa_header";
  if (/(County|Parish|Borough|Census Area|Municipality)/.test(text)) return "county_membership";
  if (/statewide|state default|standard/i.test(text)) return "statewide_default";
  return "other";
}
