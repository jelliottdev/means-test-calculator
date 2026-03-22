import {
  STATE_MEDIAN_INCOME,
  INCOME_INCREMENT_PER_PERSON_OVER_4,
  NATIONAL_FOOD_CLOTHING,
  NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4,
  HEALTHCARE_STANDARD_UNDER_65,
  HEALTHCARE_STANDARD_65_AND_OVER,
  TELECOM_ALLOWANCE,
  TRANSPORT_OWNERSHIP_1_CAR,
  TRANSPORT_OWNERSHIP_2_CAR,
  TRANSPORT_PUBLIC,
  TRANSPORT_REGIONS,
  HOUSING_STANDARDS,
  HOUSING_MSA_OVERRIDES,
  ABUSE_THRESHOLD_LOW,
  ABUSE_THRESHOLD_HIGH,
  ADMIN_EXPENSE_MULTIPLIER,
  EFFECTIVE_DATE,
  PERIOD_LABEL,
} from "../data/meansTestData";
import type { MeansTestDatasetBundle } from "./types";

const SOURCE_URL = "https://www.justice.gov/ust/means-testing";

export function getEmbeddedDatasetBundle(filingDate: string): MeansTestDatasetBundle {
  return {
    filing_date: filingDate,
    median_income: {
      kind: "median_income",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: "50 states + DC",
      increment_over_4: INCOME_INCREMENT_PER_PERSON_OVER_4,
      data: STATE_MEDIAN_INCOME,
    },
    national_standards: {
      kind: "national_standards",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: "national",
      food_clothing: Object.fromEntries(Object.entries(NATIONAL_FOOD_CLOTHING).map(([k, v]) => [String(k), v])),
      food_clothing_increment_over_4: NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4,
      healthcare_under_65: HEALTHCARE_STANDARD_UNDER_65,
      healthcare_65_and_over: HEALTHCARE_STANDARD_65_AND_OVER,
      telecom_allowance: TELECOM_ALLOWANCE,
    },
    transportation: {
      kind: "transportation",
      effective_date: "2026-04-01",
      source_url: SOURCE_URL,
      coverage: "national + regional + MSA",
      warnings: ["Embedded transport registry is transitional until generated artifacts are wired in."],
      ownership_1_car: TRANSPORT_OWNERSHIP_1_CAR,
      ownership_2_car: TRANSPORT_OWNERSHIP_2_CAR,
      public_transport: TRANSPORT_PUBLIC,
      regions: TRANSPORT_REGIONS,
    },
    housing: {
      kind: "housing",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: "state defaults + selected MSA overrides",
      warnings: ["Embedded housing registry is transitional until generated county-level artifacts are wired in."],
      state_defaults: HOUSING_STANDARDS,
      msa_overrides: HOUSING_MSA_OVERRIDES,
    },
    thresholds: {
      kind: "thresholds",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: PERIOD_LABEL,
      abuse_threshold_low: ABUSE_THRESHOLD_LOW,
      abuse_threshold_high: ABUSE_THRESHOLD_HIGH,
      admin_expense_multiplier: ADMIN_EXPENSE_MULTIPLIER,
    },
  };
}
