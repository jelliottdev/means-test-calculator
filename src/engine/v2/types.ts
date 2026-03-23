export type DataSourceKind = "median_income" | "national_standards" | "transportation" | "housing" | "thresholds";

export interface DatasetVersionMeta {
  key: string;
  effectiveDate: string;
  periodLabel: string;
  sourceUrl: string;
  sourceHash?: string;
  fetchedAt?: string;
  notes?: string[];
}

export interface IncomeSourceV2 {
  type: string;
  monthlyAmount: number;
  includedInCmi?: boolean;
  note?: string;
}

export interface VehicleInput {
  id: string;
  hasLoanOrLease: boolean;
  monthlyPayment: number;
  operatingEligible?: boolean;
  note?: string;
}

export interface MeansTestInputV2 {
  filingDate: string;
  state: string;
  county: string;
  householdSize: number;
  isJointFiling: boolean;
  incomeSources: IncomeSourceV2[];
  primaryOver65: boolean;
  spouseOver65: boolean;
  vehicles: VehicleInput[];
  monthlyMortgageRent: number;
  monthlyTaxes: number;
  monthlyInvoluntaryDeductions: number;
  monthlyTermLifeInsurance: number;
  monthlyEducationEmployment: number;
  monthlyTelecom: number;
  monthlyHealthInsurance: number;
  monthlyChildcare: number;
  monthlyChronicHealthcare: number;
  monthlyDependentChildEducation: number;
  monthlySpecialDietFood: number;
  monthlySupportObligations: number;
  monthlyPriorityDebts: number;
  monthlyOtherSecuredDebt: number;
  totalUnsecuredDebt: number;
  debtType: "consumer" | "business" | "mixed";
  isDisabledVeteran: boolean;
  isActiveReservist: boolean;
}

export interface LineItemV2 {
  label: string;
  amount: number;
  source: "national" | "local" | "actual" | "calculation";
  formLine?: string;
  note?: string;
  datasetKey?: DataSourceKind;
}

export interface CalculationAudit {
  filingDate: string;
  datasets: Record<DataSourceKind, DatasetVersionMeta>;
  assumptions: string[];
  warnings: string[];
  inputSummary: {
    incomeSourcesIncluded: number;
    vehicleCount: number;
    countyProvided: boolean;
  };
}

export type MeansTestResultV2 =
  | { outcome: "EXEMPT"; reason: string; audit: CalculationAudit }
  | {
      outcome: "BELOW_MEDIAN";
      cmi: number;
      annualizedCmi: number;
      stateMedian: number;
      deductions: LineItemV2[];
      audit: CalculationAudit;
    }
  | {
      outcome: "PASS" | "FAIL" | "BORDERLINE";
      cmi: number;
      annualizedCmi: number;
      stateMedian: number;
      deductions: LineItemV2[];
      totalDeductions: number;
      monthlyDisposable: number;
      projected60Month: number;
      abuseThresholdLow: number;
      abuseThresholdHigh: number;
      threshold25Pct: number;
      presumptionOfAbuse: boolean;
      audit: CalculationAudit;
    };
