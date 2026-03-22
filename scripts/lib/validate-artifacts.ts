import type { MeansTestDatasetBundle } from "../../src/datasets/types";

const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

export interface ArtifactValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDatasetBundle(bundle: MeansTestDatasetBundle): ArtifactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const state of STATE_CODES) {
    if (!bundle.median_income.data[state]) errors.push(`median income missing state ${state}`);
    if (!bundle.housing.state_defaults[state]) warnings.push(`housing state default missing ${state}`);
  }

  for (const hh of ["1", "2", "3", "4"]) {
    if (!bundle.national_standards.food_clothing[hh]) {
      errors.push(`national standards missing food/clothing household size ${hh}`);
    }
  }

  if (bundle.national_standards.healthcare_under_65 <= 0) errors.push("healthcare_under_65 missing or invalid");
  if (bundle.national_standards.healthcare_65_and_over <= 0) errors.push("healthcare_65_and_over missing or invalid");
  if (bundle.national_standards.telecom_allowance <= 0) errors.push("telecom_allowance missing or invalid");

  if ((bundle.housing.county_overrides?.length ?? 0) < 3000) warnings.push(`county override coverage unexpectedly low: ${bundle.housing.county_overrides?.length ?? 0}`);

  if (bundle.transportation.ownership_1_car <= 0) errors.push("transportation ownership_1_car missing or invalid");
  if (bundle.transportation.ownership_2_car <= 0) errors.push("transportation ownership_2_car missing or invalid");
  if (bundle.transportation.public_transport <= 0) errors.push("transportation public_transport missing or invalid");
  if (Object.keys(bundle.transportation.regions).length === 0) warnings.push("transportation regional/MSA registry missing");

  if (bundle.thresholds.abuse_threshold_low <= 0) errors.push("threshold low missing or invalid");
  if (bundle.thresholds.abuse_threshold_high <= 0) errors.push("threshold high missing or invalid");
  if (bundle.thresholds.admin_expense_multiplier <= 0) errors.push("admin expense multiplier missing or invalid");

  return { ok: errors.length === 0, errors, warnings };
}
