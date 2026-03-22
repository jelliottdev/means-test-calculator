export type MeansTestDatasetKind =
  | "median_income"
  | "national_standards"
  | "transportation"
  | "housing"
  | "thresholds";

export interface DatasetArtifactHeader {
  kind: MeansTestDatasetKind;
  effective_date: string;
  source_url: string;
  source_hash?: string;
  fetched_at?: string;
  coverage?: string;
  warnings?: string[];
}

export interface MedianIncomeArtifact extends DatasetArtifactHeader {
  kind: "median_income";
  increment_over_4: number;
  data: Record<string, [number, number, number, number]>;
}

export interface NationalStandardsArtifact extends DatasetArtifactHeader {
  kind: "national_standards";
  food_clothing: Record<string, number>;
  food_clothing_increment_over_4: number;
  healthcare_under_65: number;
  healthcare_65_and_over: number;
  telecom_allowance: number;
}

export interface TransportationArtifact extends DatasetArtifactHeader {
  kind: "transportation";
  ownership_1_car: number;
  ownership_2_car: number;
  public_transport: number;
  regions: Record<string, {
    states: string[];
    regional: [number, number];
    msas: Record<string, {
      counties: Partial<Record<string, string[]>>;
      costs: [number, number];
    }>;
  }>;
}

export interface HousingArtifact extends DatasetArtifactHeader {
  kind: "housing";
  state_defaults: Record<string, {
    utility: [number, number, number, number, number];
    mortgage: [number, number, number, number, number];
  }>;
  msa_overrides?: Array<{
    name: string;
    counties: Partial<Record<string, string[]>>;
    utility: [number, number, number, number, number];
    mortgage: [number, number, number, number, number];
  }>;
}

export interface ThresholdsArtifact extends DatasetArtifactHeader {
  kind: "thresholds";
  abuse_threshold_low: number;
  abuse_threshold_high: number;
  admin_expense_multiplier: number;
}

export type MeansTestDatasetArtifact =
  | MedianIncomeArtifact
  | NationalStandardsArtifact
  | TransportationArtifact
  | HousingArtifact
  | ThresholdsArtifact;

export interface MeansTestDatasetBundle {
  filing_date: string;
  median_income: MedianIncomeArtifact;
  national_standards: NationalStandardsArtifact;
  transportation: TransportationArtifact;
  housing: HousingArtifact;
  thresholds: ThresholdsArtifact;
}
