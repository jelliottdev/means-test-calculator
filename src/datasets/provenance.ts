import type { MeansTestDatasetBundle } from "./types";

export interface DatasetProvenanceRecord {
  kind: string;
  effective_date: string;
  source_url: string;
  source_hash?: string;
  fetched_at?: string;
  coverage?: string;
  warnings?: string[];
}

export interface BundleProvenance {
  filing_date: string;
  datasets: DatasetProvenanceRecord[];
}

export function getBundleProvenance(bundle: MeansTestDatasetBundle): BundleProvenance {
  return {
    filing_date: bundle.filing_date,
    datasets: [
      bundle.median_income,
      bundle.national_standards,
      bundle.transportation,
      bundle.housing,
      bundle.thresholds,
    ].map((dataset) => ({
      kind: dataset.kind,
      effective_date: dataset.effective_date,
      source_url: dataset.source_url,
      source_hash: dataset.source_hash,
      fetched_at: dataset.fetched_at,
      coverage: dataset.coverage,
      warnings: dataset.warnings,
    })),
  };
}
