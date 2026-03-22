import type { NationalStandardsArtifact } from "../../src/datasets/types";
import { parseCells, parseDollar, tableRows } from "./html";

export function parseNationalStandardsArtifact(params: {
  html: string;
  sourceUrl: string;
  effectiveDate: string;
  sourceHash?: string;
  fetchedAt?: string;
}): NationalStandardsArtifact {
  const foodClothing: Record<string, number> = {};
  let foodClothingIncrementOver4 = 0;
  let healthcareUnder65 = 0;
  let healthcare65AndOver = 0;
  let telecomAllowance = 0;

  for (const row of tableRows(params.html)) {
    const cells = parseCells(row, "both");
    if (cells.length < 2) continue;

    const label = cells[0].toLowerCase();
    const amount = parseDollar(cells[1]);
    if (amount <= 0) continue;

    const hhMatch = label.match(/^(1|2|3|4)\s*(?:person|people)\b/i);
    if (hhMatch) {
      foodClothing[hhMatch[1]] = amount;
      continue;
    }

    if (/additional/i.test(label) && /(person|people)/i.test(label)) {
      foodClothingIncrementOver4 = amount;
      continue;
    }

    if (/under\s*65/i.test(label)) {
      healthcareUnder65 = amount;
      continue;
    }

    if (/65\s*(?:and\s*over|or\s*older)/i.test(label)) {
      healthcare65AndOver = amount;
      continue;
    }

    if (/(telecom|telephone|internet|fax)/i.test(label)) {
      telecomAllowance = amount;
      continue;
    }
  }

  const missing: string[] = [];
  for (const key of ["1", "2", "3", "4"]) {
    if (!foodClothing[key]) missing.push(`food_clothing_${key}`);
  }
  if (!foodClothingIncrementOver4) missing.push("food_clothing_increment_over_4");
  if (!healthcareUnder65) missing.push("healthcare_under_65");
  if (!healthcare65AndOver) missing.push("healthcare_65_and_over");
  if (!telecomAllowance) missing.push("telecom_allowance");

  if (missing.length > 0) {
    throw new Error(`National standards parser incomplete: missing ${missing.join(", ")}`);
  }

  return {
    kind: "national_standards",
    effective_date: params.effectiveDate,
    source_url: params.sourceUrl,
    source_hash: params.sourceHash,
    fetched_at: params.fetchedAt,
    coverage: "national",
    food_clothing: foodClothing,
    food_clothing_increment_over_4: foodClothingIncrementOver4,
    healthcare_under_65: healthcareUnder65,
    healthcare_65_and_over: healthcare65AndOver,
    telecom_allowance: telecomAllowance,
  };
}
