import type { HousingArtifact, TransportationArtifact } from "../../src/datasets/types";

const EXPECTED_TRANSPORT_REGIONS = ["South", "West", "Midwest", "Northeast"];
const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

export interface GeographyCoverageCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTransportationCoverage(transportation: TransportationArtifact): GeographyCoverageCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const region of EXPECTED_TRANSPORT_REGIONS) {
    if (!transportation.regions[region]) {
      errors.push(`transportation missing region ${region}`);
    }
  }

  const coveredStates = new Set<string>();
  for (const region of Object.values(transportation.regions)) {
    for (const state of region.states) coveredStates.add(state);
    if (!region.regional || region.regional[0] <= 0 || region.regional[1] <= 0) {
      warnings.push("transportation region missing valid regional operating costs");
    }
  }

  for (const state of STATE_CODES) {
    if (!coveredStates.has(state)) warnings.push(`transportation does not map state ${state} to a region`);
  }

  if (Object.keys(transportation.regions).length === 0) {
    errors.push("transportation MSA/regional registry empty");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateHousingCoverage(housing: HousingArtifact): GeographyCoverageCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  let coveredStates = 0;
  for (const state of STATE_CODES) {
    const std = housing.state_defaults[state];
    if (!std) {
      warnings.push(`housing missing state default ${state}`);
      continue;
    }
    coveredStates += 1;
    if (std.utility.some((n) => n <= 0)) errors.push(`housing utility values invalid for ${state}`);
    if (std.mortgage.some((n) => n <= 0)) errors.push(`housing mortgage values invalid for ${state}`);
  }

  if (coveredStates < 40) {
    errors.push(`housing state coverage too low: ${coveredStates}`);
  }

  if ((housing.msa_overrides?.length ?? 0) === 0) {
    warnings.push("housing has no MSA overrides");
  }

  return { ok: errors.length === 0, errors, warnings };
}
