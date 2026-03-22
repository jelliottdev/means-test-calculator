import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  HousingArtifact,
  MedianIncomeArtifact,
  NationalStandardsArtifact,
  ThresholdsArtifact,
  TransportationArtifact,
} from "../../src/datasets/types";

export interface ArtifactWriteSet {
  filingDate: string;
  medianIncome: MedianIncomeArtifact;
  nationalStandards: NationalStandardsArtifact;
  transportation: TransportationArtifact;
  housing: HousingArtifact;
  thresholds: ThresholdsArtifact;
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function writeArtifacts(rootDir: string, set: ArtifactWriteSet) {
  const root = resolve(rootDir);

  const versions = new Set<string>([
    set.medianIncome.effective_date,
    set.nationalStandards.effective_date,
    set.transportation.effective_date,
    set.housing.effective_date,
    set.thresholds.effective_date,
    set.filingDate,
  ]);

  for (const version of versions) {
    mkdirSync(join(root, version), { recursive: true });
  }

  writeJson(join(root, set.medianIncome.effective_date, "median-income.json"), set.medianIncome);
  writeJson(join(root, set.nationalStandards.effective_date, "national-standards.json"), set.nationalStandards);
  writeJson(join(root, set.transportation.effective_date, "transportation.json"), set.transportation);
  writeJson(join(root, set.housing.effective_date, "housing.json"), set.housing);
  writeJson(join(root, set.thresholds.effective_date, "thresholds.json"), set.thresholds);

  writeJson(join(root, set.filingDate, "manifest.json"), {
    filing_date_resolution: {
      median_income: set.medianIncome.effective_date,
      national_standards: set.nationalStandards.effective_date,
      transportation: set.transportation.effective_date,
      housing: set.housing.effective_date,
      thresholds: set.thresholds.effective_date,
    },
  });
}
