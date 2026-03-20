import {
  STATE_MEDIAN_INCOME,
  INCOME_INCREMENT_PER_PERSON_OVER_4,
  NATIONAL_FOOD_CLOTHING,
  NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4,
  HEALTHCARE_STANDARD_UNDER_65,
  HEALTHCARE_STANDARD_65_AND_OVER,
  TRANSPORT_OWNERSHIP_1_CAR,
  TRANSPORT_OWNERSHIP_2_CAR,
  TRANSPORT_PUBLIC,
  ABUSE_THRESHOLD_LOW,
  ABUSE_THRESHOLD_HIGH,
  getTransportOperatingCost,
  getHousingAllowance,
} from "../data/meansTestData";

// ── Input Types ──────────────────────────────────────────────────────────────

export interface IncomeSource {
  type: string;
  monthlyAmount: number;
}

export interface MeansTestInput {
  // Case info
  filingDate: string;
  state: string;       // 2-letter abbr
  county: string;
  householdSize: number;
  isJointFiling: boolean;

  // Income (6-month average, excludes Social Security)
  incomeSources: IncomeSource[];

  // Debtors above 65?
  primaryOver65: boolean;
  spouseOver65: boolean;

  // Vehicles
  numVehicles: 0 | 1 | 2;
  hasCarPayment: boolean;
  monthlyCarPayment: number; // actual car loan/lease payment

  // Actual expense inputs
  monthlyMortgageRent: number;
  monthlyTaxes: number;           // payroll + income taxes
  monthlyHealthInsurance: number;
  monthlyChildcare: number;
  monthlySupportObligations: number; // domestic support paid
  monthlyOtherSecuredDebt: number;

  // Debt info
  totalUnsecuredDebt: number;
  debtType: "consumer" | "business" | "mixed";

  // Exemptions
  isDisabledVeteran: boolean;
  isActiveReservist: boolean;
}

// ── Output Types ─────────────────────────────────────────────────────────────

export interface LineItem {
  label: string;
  amount: number;
  source: "national" | "local" | "actual" | "calculation";
  formLine?: string;
  note?: string;
}

export type MeansTestResult =
  | { outcome: "EXEMPT"; reason: string }
  | { outcome: "BELOW_MEDIAN"; cmi: number; annualizedCmi: number; stateMedian: number; deductions: LineItem[] }
  | { outcome: "PASS" | "FAIL" | "BORDERLINE"; cmi: number; annualizedCmi: number; stateMedian: number; deductions: LineItem[]; totalDeductions: number; monthlyDisposable: number; projected60Month: number; threshold25Pct: number; presumptionOfAbuse: boolean };

// ── Engine ───────────────────────────────────────────────────────────────────

export function runMeansTest(input: MeansTestInput): MeansTestResult {
  // 1. Check exemptions
  if (input.isDisabledVeteran && input.debtType !== "business") {
    return { outcome: "EXEMPT", reason: "Disabled veteran exemption (11 U.S.C. § 707(b)(2)(D))" };
  }
  if (input.isActiveReservist) {
    return { outcome: "EXEMPT", reason: "Active duty/reservist exemption (11 U.S.C. § 707(b)(2)(D))" };
  }
  if (input.debtType === "business") {
    return { outcome: "EXEMPT", reason: "Primarily business debts — means test not required (11 U.S.C. § 707(b)(2))" };
  }

  // 2. Current Monthly Income
  const cmi = input.incomeSources.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const annualizedCmi = cmi * 12;

  // 3. State median lookup
  const medians = STATE_MEDIAN_INCOME[input.state];
  if (!medians) throw new Error(`Unknown state: ${input.state}`);
  const size = Math.min(input.householdSize, 4) - 1;
  let stateMedian = medians[size];
  if (input.householdSize > 4) {
    stateMedian += (input.householdSize - 4) * INCOME_INCREMENT_PER_PERSON_OVER_4;
  }

  // 4. Below-median check
  if (annualizedCmi <= stateMedian) {
    return { outcome: "BELOW_MEDIAN", cmi, annualizedCmi, stateMedian, deductions: [] };
  }

  // 5. Above-median: compute allowed deductions (Form 122A-2)
  const deductions: LineItem[] = [];

  // Line 6: National Standards - Food & Clothing
  const foodClothing = input.householdSize <= 4
    ? NATIONAL_FOOD_CLOTHING[input.householdSize]
    : NATIONAL_FOOD_CLOTHING[4] + (input.householdSize - 4) * NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4;
  deductions.push({ label: "Food & Clothing (National Standard)", amount: foodClothing, source: "national", formLine: "6" });

  // Line 7: Out-of-pocket healthcare
  const dependents = input.householdSize - (input.isJointFiling ? 2 : 1);
  const primaryHC = input.primaryOver65 ? HEALTHCARE_STANDARD_65_AND_OVER : HEALTHCARE_STANDARD_UNDER_65;
  const spouseHC = input.isJointFiling ? (input.spouseOver65 ? HEALTHCARE_STANDARD_65_AND_OVER : HEALTHCARE_STANDARD_UNDER_65) : 0;
  const depHC = Math.max(0, dependents) * HEALTHCARE_STANDARD_UNDER_65;
  const totalHC = primaryHC + spouseHC + depHC;
  deductions.push({ label: "Out-of-Pocket Healthcare (National Standard)", amount: totalHC, source: "national", formLine: "7" });

  // Lines 8-9: Local Housing & Utilities
  const housingAllowance = getHousingAllowance(input.state, input.county, input.householdSize);
  const housingActual = input.monthlyMortgageRent;
  const housingDeduction = Math.min(housingAllowance, housingActual > 0 ? housingActual : housingAllowance);
  deductions.push({
    label: "Housing & Utilities (Local Standard)",
    amount: housingDeduction,
    source: "local",
    formLine: "8-9",
    note: housingActual === 0 ? "Using local standard (no actual provided)" : housingActual > housingAllowance ? `Capped at local standard; actual was $${housingActual}` : "Using actual (below local standard)",
  });

  // Lines 12-13: Transportation
  if (input.numVehicles === 0) {
    deductions.push({ label: "Public Transportation (National)", amount: TRANSPORT_PUBLIC, source: "national", formLine: "14", note: "No vehicle — public transit allowance" });
  } else {
    // Operating costs
    const operatingCost = getTransportOperatingCost(input.state, input.county, input.numVehicles);
    deductions.push({ label: `Vehicle Operating Costs (Local Standard, ${input.numVehicles} car${input.numVehicles > 1 ? "s" : ""})`, amount: operatingCost, source: "local", formLine: "12" });

    // Ownership costs
    if (input.hasCarPayment) {
      const ownershipStandard = input.numVehicles >= 2 ? TRANSPORT_OWNERSHIP_2_CAR : TRANSPORT_OWNERSHIP_1_CAR;
      const ownershipDeduction = Math.min(ownershipStandard, input.monthlyCarPayment);
      deductions.push({
        label: `Vehicle Ownership Costs (${input.numVehicles} car${input.numVehicles > 1 ? "s" : ""})`,
        amount: ownershipDeduction,
        source: "local",
        formLine: "13a",
        note: input.monthlyCarPayment > ownershipStandard ? `Capped at standard; actual payment $${input.monthlyCarPayment}` : undefined,
      });
    }
  }

  // Actual expense deductions
  if (input.monthlyTaxes > 0) {
    deductions.push({ label: "Taxes (Payroll & Income)", amount: input.monthlyTaxes, source: "actual", formLine: "16" });
  }
  if (input.monthlyHealthInsurance > 0) {
    deductions.push({ label: "Health Insurance Premiums", amount: input.monthlyHealthInsurance, source: "actual", formLine: "25a" });
  }
  if (input.monthlyChildcare > 0) {
    deductions.push({ label: "Childcare", amount: input.monthlyChildcare, source: "actual", formLine: "25b" });
  }
  if (input.monthlySupportObligations > 0) {
    deductions.push({ label: "Domestic Support Obligations", amount: input.monthlySupportObligations, source: "actual", formLine: "25e" });
  }
  if (input.monthlyOtherSecuredDebt > 0) {
    deductions.push({ label: "Other Secured Debt Payments", amount: input.monthlyOtherSecuredDebt, source: "actual", formLine: "33" });
  }

  // 6. Monthly disposable income
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const monthlyDisposable = Math.max(0, cmi - totalDeductions);

  // 7. 60-month projection
  const projected60Month = monthlyDisposable * 60;
  const threshold25Pct = input.totalUnsecuredDebt * 0.25;

  // 8. Outcome
  let outcome: "PASS" | "FAIL" | "BORDERLINE";
  const presumptionOfAbuse =
    projected60Month >= ABUSE_THRESHOLD_HIGH ||
    (projected60Month >= ABUSE_THRESHOLD_LOW && projected60Month >= threshold25Pct);

  if (projected60Month < ABUSE_THRESHOLD_LOW) {
    outcome = "PASS";
  } else if (projected60Month >= ABUSE_THRESHOLD_HIGH) {
    outcome = "FAIL";
  } else if (projected60Month >= threshold25Pct) {
    outcome = "FAIL";
  } else {
    outcome = "PASS"; // above low threshold but below 25% of unsecured
  }

  // BORDERLINE: above low threshold, could go either way
  if (projected60Month >= ABUSE_THRESHOLD_LOW && projected60Month < ABUSE_THRESHOLD_HIGH && projected60Month < threshold25Pct) {
    outcome = "BORDERLINE";
  }

  return {
    outcome,
    cmi,
    annualizedCmi,
    stateMedian,
    deductions,
    totalDeductions,
    monthlyDisposable,
    projected60Month,
    threshold25Pct,
    presumptionOfAbuse,
  };
}
