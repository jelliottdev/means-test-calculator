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
  HOUSING_COUNTY_OVERRIDES,
  HOUSING_MSA_OVERRIDES,
  ABUSE_THRESHOLD_LOW,
  ABUSE_THRESHOLD_HIGH,
  ADMIN_EXPENSE_MULTIPLIER,
  EFFECTIVE_DATE,
  PERIOD_LABEL,
} from "../data/meansTestData";
import type { MeansTestDatasetBundle } from "./types";

const SOURCE_URL = "https://www.justice.gov/ust/means-testing";
const TRANSPORT_EFFECTIVE_DATE = "2026-04-01";
const SOURCE_HASHES = {
  median_income: "embedded-snapshot:1319e5bb28c740baa0aec4f43135eee3b095993a820e2ee8633cd43d9388132d",
  national_standards: "embedded-snapshot:e23536116853f30ef8f118337890d2124169cddfd715a8718e0e02ef6552af55",
  transportation: "embedded-snapshot:b70c3d0c14a0f99da612b8557518869066bef2324563c387ef5938dfca389195",
  housing: "embedded-snapshot:dec6ab5b8326cac8ddd0385395a3dc0ee9226b3261dbf9058fe4cdb955049d74",
  thresholds: "embedded-snapshot:82d982ce7a40c23e9f64b6ab95fff78a773a28675e154b797491badb6b3cac97",
} as const;


export const EMBEDDED_MIN_SUPPORTED_FILING_DATE = [
  EFFECTIVE_DATE,
  TRANSPORT_EFFECTIVE_DATE,
].sort().slice(-1)[0];

export interface EmbeddedDatasetSupport {
  supported: boolean;
  minimumFilingDate: string;
  reason?: string;
}

export function getEmbeddedDatasetSupport(filingDate: string): EmbeddedDatasetSupport {
  if (filingDate.localeCompare(EMBEDDED_MIN_SUPPORTED_FILING_DATE) < 0) {
    return {
      supported: false,
      minimumFilingDate: EMBEDDED_MIN_SUPPORTED_FILING_DATE,
      reason: `Embedded transportation data is only effective ${TRANSPORT_EFFECTIVE_DATE}, so this build cannot safely calculate filings before ${EMBEDDED_MIN_SUPPORTED_FILING_DATE}.`,
    };
  }

  return { supported: true, minimumFilingDate: EMBEDDED_MIN_SUPPORTED_FILING_DATE };
}

export function getEmbeddedDatasetBundle(filingDate: string): MeansTestDatasetBundle {
  const support = getEmbeddedDatasetSupport(filingDate);
  if (!support.supported) throw new Error(support.reason);
  return {
    filing_date: filingDate,
    median_income: {
      kind: "median_income",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: "50 states + DC",
      source_hash: SOURCE_HASHES.median_income,
      increment_over_4: INCOME_INCREMENT_PER_PERSON_OVER_4,
      data: STATE_MEDIAN_INCOME,
    },
    national_standards: {
      kind: "national_standards",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: "national",
      source_hash: SOURCE_HASHES.national_standards,
      food_clothing: Object.fromEntries(Object.entries(NATIONAL_FOOD_CLOTHING).map(([k, v]) => [String(k), v])),
      food_clothing_increment_over_4: NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4,
      healthcare_under_65: HEALTHCARE_STANDARD_UNDER_65,
      healthcare_65_and_over: HEALTHCARE_STANDARD_65_AND_OVER,
      telecom_allowance: TELECOM_ALLOWANCE,
    },
    transportation: {
      kind: "transportation",
      effective_date: TRANSPORT_EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: "national + regional + MSA",
      source_hash: SOURCE_HASHES.transportation,
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
      coverage: "state defaults + selected MSA overrides + nationwide county and county-equivalent overrides",
      source_hash: SOURCE_HASHES.housing,
      warnings: ["Embedded housing registry is transitional until generated county-level artifacts are wired in."],
      county_overrides: HOUSING_COUNTY_OVERRIDES,
      state_defaults: HOUSING_STANDARDS,
      msa_overrides: HOUSING_MSA_OVERRIDES,
    },
    thresholds: {
      kind: "thresholds",
      effective_date: EFFECTIVE_DATE,
      source_url: SOURCE_URL,
      coverage: PERIOD_LABEL,
      source_hash: SOURCE_HASHES.thresholds,
      abuse_threshold_low: ABUSE_THRESHOLD_LOW,
      abuse_threshold_high: ABUSE_THRESHOLD_HIGH,
      admin_expense_multiplier: ADMIN_EXPENSE_MULTIPLIER,
    },
  };
}
