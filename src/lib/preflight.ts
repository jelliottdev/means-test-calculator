import type { MeansTestDatasetBundle } from "../datasets/types";

export interface MeansTestPreflightAssessment {
  annualizedCmi: number;
  stateMedian?: number;
  deltaFromMedian?: number;
  status: "needs_input" | "unsupported_filing_date" | "business_debts_exempt" | "below_median" | "above_median";
  summary: string;
}

export function getStateMedianForHouseholdSize(bundle: MeansTestDatasetBundle, state: string, householdSize: number): number | undefined {
  const medians = bundle.median_income.data[state];
  if (!medians || householdSize < 1) return undefined;

  const baseMedian = medians[Math.min(householdSize, 4) - 1];
  if (householdSize <= 4) return baseMedian;

  return baseMedian + ((householdSize - 4) * bundle.median_income.increment_over_4);
}

export function getMeansTestPreflightAssessment(args: {
  bundle?: MeansTestDatasetBundle;
  supportedFilingDate: boolean;
  state: string;
  householdSize: number;
  totalCmi: number;
  debtType: "consumer" | "business" | "mixed";
}): MeansTestPreflightAssessment {
  const annualizedCmi = args.totalCmi * 12;

  if (args.debtType === "business") {
    return {
      annualizedCmi,
      status: "business_debts_exempt",
      summary: "Primarily business debts typically bypass the Chapter 7 means test, but attorney review is still required.",
    };
  }

  if (!args.supportedFilingDate) {
    return {
      annualizedCmi,
      status: "unsupported_filing_date",
      summary: "Select a supported filing date before relying on a median-income preview.",
    };
  }

  if (!args.bundle || !args.state || args.householdSize < 1) {
    return {
      annualizedCmi,
      status: "needs_input",
      summary: "Add filing-date support, state, and household size to preview the likely median-income path.",
    };
  }

  const stateMedian = getStateMedianForHouseholdSize(args.bundle, args.state, args.householdSize);
  if (stateMedian === undefined) {
    return {
      annualizedCmi,
      status: "needs_input",
      summary: "State median data is unavailable for the selected jurisdiction in the current bundle.",
    };
  }

  const deltaFromMedian = annualizedCmi - stateMedian;
  if (annualizedCmi <= stateMedian) {
    return {
      annualizedCmi,
      stateMedian,
      deltaFromMedian,
      status: "below_median",
      summary: "Annualized CMI is currently below the applicable state median, so the case likely stays on the shorter Chapter 7 path.",
    };
  }

  return {
    annualizedCmi,
    stateMedian,
    deltaFromMedian,
    status: "above_median",
    summary: "Annualized CMI is above the applicable state median, so a full Form 122A-2 deduction review is likely required.",
  };
}

