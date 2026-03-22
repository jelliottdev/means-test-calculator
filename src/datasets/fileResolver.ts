import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type {
  HousingArtifact,
  MeansTestDatasetBundle,
  MedianIncomeArtifact,
  NationalStandardsArtifact,
  ThresholdsArtifact,
  TransportationArtifact,
} from "./types";
import type { DatasetResolver } from "./resolver";

interface Manifest {
  filing_date_resolution: {
    median_income: string;
    national_standards: string;
    transportation: string;
    housing: string;
    thresholds: string;
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export class FileDatasetResolver implements DatasetResolver {
  constructor(private readonly rootDir: string) {}

  resolve(filingDate: string): MeansTestDatasetBundle {
    const manifestPath = resolve(this.rootDir, filingDate, "manifest.json");
    if (!existsSync(manifestPath)) {
      throw new Error(`Dataset manifest not found for filing date ${filingDate}: ${manifestPath}`);
    }

    const manifest = readJson<Manifest>(manifestPath);

    const median_income = this.loadArtifact<MedianIncomeArtifact>(manifest.filing_date_resolution.median_income, "median-income.json");
    const national_standards = this.loadArtifact<NationalStandardsArtifact>(manifest.filing_date_resolution.national_standards, "national-standards.json");
    const transportation = this.loadArtifact<TransportationArtifact>(manifest.filing_date_resolution.transportation, "transportation.json");
    const housing = this.loadArtifact<HousingArtifact>(manifest.filing_date_resolution.housing, "housing.json");
    const thresholds = this.loadArtifact<ThresholdsArtifact>(manifest.filing_date_resolution.thresholds, "thresholds.json");

    return {
      filing_date: filingDate,
      median_income,
      national_standards,
      transportation,
      housing,
      thresholds,
    };
  }

  private loadArtifact<T>(effectiveDate: string, filename: string): T {
    const fullPath = join(this.rootDir, effectiveDate, filename);
    if (!existsSync(fullPath)) {
      throw new Error(`Dataset artifact not found: ${fullPath}`);
    }
    return readJson<T>(fullPath);
  }
}
