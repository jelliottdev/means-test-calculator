import {
  EFFECTIVE_DATE,
  PERIOD_LABEL,
} from "../../data/meansTestData";
import type { DatasetVersionMeta, DataSourceKind } from "./types";

const DEFAULT_SOURCE = "https://www.justice.gov/ust/means-testing";

export const DATASET_REGISTRY: Record<DataSourceKind, DatasetVersionMeta> = {
  median_income: {
    key: "median_income",
    effectiveDate: EFFECTIVE_DATE,
    periodLabel: PERIOD_LABEL,
    sourceUrl: DEFAULT_SOURCE,
  },
  national_standards: {
    key: "national_standards",
    effectiveDate: EFFECTIVE_DATE,
    periodLabel: PERIOD_LABEL,
    sourceUrl: DEFAULT_SOURCE,
  },
  transportation: {
    key: "transportation",
    effectiveDate: "2026-04-01",
    periodLabel: "Transportation standards effective April 1, 2026",
    sourceUrl: DEFAULT_SOURCE,
    notes: ["This dataset may carry a different effective date than median income and housing."],
  },
  housing: {
    key: "housing",
    effectiveDate: EFFECTIVE_DATE,
    periodLabel: PERIOD_LABEL,
    sourceUrl: DEFAULT_SOURCE,
    notes: ["County/MSA fallback behavior may apply when county input is missing or unmatched."],
  },
  thresholds: {
    key: "thresholds",
    effectiveDate: EFFECTIVE_DATE,
    periodLabel: PERIOD_LABEL,
    sourceUrl: DEFAULT_SOURCE,
  },
};

export function getDatasetRegistrySnapshot(): Record<DataSourceKind, DatasetVersionMeta> {
  return {
    median_income: { ...DATASET_REGISTRY.median_income },
    national_standards: { ...DATASET_REGISTRY.national_standards },
    transportation: { ...DATASET_REGISTRY.transportation },
    housing: { ...DATASET_REGISTRY.housing },
    thresholds: { ...DATASET_REGISTRY.thresholds },
  };
}
