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
  TELECOM_ALLOWANCE,
  ADMIN_EXPENSE_MULTIPLIER,
  ABUSE_THRESHOLD_LOW,
  ABUSE_THRESHOLD_HIGH,
  getTransportOperatingCost,
  getHousingAllowance,
} from "../data/meansTestData";

// ── Input Types ───────────────────────────────────────────────────────────────

export interface IncomeSource {
  type: string;
  monthlyAmount: number;
}

export interface MeansTestInput {
  // Case info
  filingDate: string;
  state: string;         // 2-letter abbreviation
  county: string;
  householdSize: number;
  isJointFiling: boolean;

  // Income — 6-month average, excludes Social Security (11 U.S.C. § 101(10A))
  incomeSources: IncomeSource[];

  // Age (affects healthcare standard)
  primaryOver65: boolean;
  spouseOver65: boolean;

  // Transportation
  numVehicles: 0 | 1 | 2;
  hasCarPayment: boolean;
  monthlyCarPayment: number;

  // ── Actual Expense Deductions (Form 122A-2) ──────────────────────────────
  // Line 8b
  monthlyMortgageRent: number;
  // Line 16 — taxes
  monthlyTaxes: number;              // payroll + income taxes withheld/paid
  // Line 17 — involuntary deductions
  monthlyInvoluntaryDeductions: number; // mandatory retirement, union dues, uniform costs
  // Line 18 — life insurance
  monthlyTermLifeInsurance: number;  // term life premiums for debtor's dependents
  // Line 19 — employment education
  monthlyEducationEmployment: number; // tuition/fees required for current job
  // Line 22 — telecommunications (capped at IRS allowance)
  monthlyTelecom: number;
  // Line 25a
  monthlyHealthInsurance: number;    // premiums paid, not reimbursed
  // Line 25b
  monthlyChildcare: number;
  // Line 21 — additional healthcare (above national standard)
  monthlyChronicHealthcare: number;  // ongoing treatment for chronically ill or disabled household member
  // Line 25c — dependent children K-12 education
  monthlyDependentChildEducation: number; // legally required school tuition/fees for children under 18
  // Line 25d — special diet / medical food
  monthlySpecialDietFood: number;    // additional food costs above Line 6 standard for medical reasons
  // Line 25e
  monthlySupportObligations: number; // domestic support paid by court order
  // Lines 24–26 — priority claims
  monthlyPriorityDebts: number;      // back taxes, domestic support arrears
  // Line 33 — other secured debt
  monthlyOtherSecuredDebt: number;

  // Debt info
  totalUnsecuredDebt: number;
  debtType: "consumer" | "business" | "mixed";

  // Exemptions
  isDisabledVeteran: boolean;
  isActiveReservist: boolean;
}

// ── Output Types ──────────────────────────────────────────────────────────────

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
  | {
      outcome: "PASS" | "FAIL" | "BORDERLINE";
      cmi: number;
      annualizedCmi: number;
      stateMedian: number;
      deductions: LineItem[];
      totalDeductions: number;
      monthlyDisposable: number;
      projected60Month: number;
      threshold25Pct: number;
      presumptionOfAbuse: boolean;
    };

// ── Engine ────────────────────────────────────────────────────────────────────

export function runMeansTest(input: MeansTestInput): MeansTestResult {

  // 1. Exemption checks (11 U.S.C. § 707(b)(2)(D))
  if (input.isDisabledVeteran && input.debtType !== "business") {
    return { outcome: "EXEMPT", reason: "Disabled veteran exemption (11 U.S.C. § 707(b)(2)(D))" };
  }
  if (input.isActiveReservist) {
    return { outcome: "EXEMPT", reason: "Active duty/reservist exemption (11 U.S.C. § 707(b)(2)(D))" };
  }
  if (input.debtType === "business") {
    return { outcome: "EXEMPT", reason: "Primarily business debts — means test not required (11 U.S.C. § 707(b)(2))" };
  }

  // 2. Current Monthly Income (Form 122A-1 Line 11)
  const cmi = input.incomeSources.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const annualizedCmi = cmi * 12;

  // 3. State median income lookup
  const medians = STATE_MEDIAN_INCOME[input.state];
  if (!medians) throw new Error(`Unknown state: ${input.state}`);
  const sizeIdx = Math.min(input.householdSize, 4) - 1;
  let stateMedian = medians[sizeIdx];
  if (input.householdSize > 4) {
    stateMedian += (input.householdSize - 4) * INCOME_INCREMENT_PER_PERSON_OVER_4;
  }

  // 4. Below-median → automatic pass, no Form 122A-2 required
  if (annualizedCmi <= stateMedian) {
    return { outcome: "BELOW_MEDIAN", cmi, annualizedCmi, stateMedian, deductions: [] };
  }

  // 5. Above-median → compute Form 122A-2 allowed deductions
  const deductions: LineItem[] = [];

  // ── National Standards ────────────────────────────────────────────────────

  // Line 6: Food, clothing & other items
  const foodClothing = input.householdSize <= 4
    ? NATIONAL_FOOD_CLOTHING[input.householdSize]
    : NATIONAL_FOOD_CLOTHING[4] + (input.householdSize - 4) * NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4;
  deductions.push({
    label: "Food, Clothing & Other Items (National Standard)",
    amount: foodClothing,
    source: "national",
    formLine: "6",
  });

  // Line 7: Out-of-pocket healthcare
  const adultCount = input.isJointFiling ? 2 : 1;
  const dependents = Math.max(0, input.householdSize - adultCount);
  const primaryHC  = input.primaryOver65 ? HEALTHCARE_STANDARD_65_AND_OVER : HEALTHCARE_STANDARD_UNDER_65;
  const spouseHC   = input.isJointFiling ? (input.spouseOver65 ? HEALTHCARE_STANDARD_65_AND_OVER : HEALTHCARE_STANDARD_UNDER_65) : 0;
  const depHC      = dependents * HEALTHCARE_STANDARD_UNDER_65;
  const totalHC    = primaryHC + spouseHC + depHC;
  deductions.push({
    label: "Out-of-Pocket Healthcare (National Standard)",
    amount: totalHC,
    source: "national",
    formLine: "7",
    note: `${adultCount + dependents} person(s): ${input.primaryOver65 ? "primary 65+" : "primary <65"}${input.isJointFiling ? (input.spouseOver65 ? ", spouse 65+" : ", spouse <65") : ""}${dependents > 0 ? `, ${dependents} dependent(s)` : ""}`,
  });

  // ── Local Standards — Housing & Utilities ─────────────────────────────────

  const { utility, mortgageCap } = getHousingAllowance(input.state, input.county, input.householdSize);

  // Line 8a: Non-mortgage expenses (utilities, maintenance) — always allowed
  deductions.push({
    label: "Housing: Non-Mortgage Expenses (Local Standard)",
    amount: utility,
    source: "local",
    formLine: "8a",
  });

  // Line 8b: Mortgage or rent cap
  const actualMortgage = input.monthlyMortgageRent;
  const mortgageDeduction = actualMortgage > 0
    ? Math.min(mortgageCap, actualMortgage)
    : mortgageCap;
  deductions.push({
    label: "Housing: Mortgage/Rent (Local Standard Cap)",
    amount: mortgageDeduction,
    source: "local",
    formLine: "8b",
    note: actualMortgage === 0
      ? "Using IRS cap (no actual provided)"
      : actualMortgage > mortgageCap
        ? `Capped at IRS standard $${mortgageCap}; actual $${actualMortgage}`
        : `Actual $${actualMortgage} (below IRS cap $${mortgageCap})`,
  });

  // ── Local Standards — Transportation ──────────────────────────────────────

  if (input.numVehicles === 0) {
    // Line 14: Public transit
    deductions.push({
      label: "Public Transportation (National Standard)",
      amount: TRANSPORT_PUBLIC,
      source: "national",
      formLine: "14",
      note: "No vehicle — nationwide public transit allowance",
    });
  } else {
    // Line 12: Vehicle operating costs
    const operatingCost = getTransportOperatingCost(input.state, input.county, input.numVehicles);
    deductions.push({
      label: `Vehicle Operating Costs (${input.numVehicles} car${input.numVehicles > 1 ? "s" : ""}, Local Standard)`,
      amount: operatingCost,
      source: "local",
      formLine: "12",
    });

    // Line 13a: Vehicle ownership/lease costs (only if car payment exists)
    if (input.hasCarPayment && input.monthlyCarPayment > 0) {
      const ownershipStd = input.numVehicles >= 2 ? TRANSPORT_OWNERSHIP_2_CAR : TRANSPORT_OWNERSHIP_1_CAR;
      const ownershipDeduction = Math.min(ownershipStd, input.monthlyCarPayment);
      deductions.push({
        label: `Vehicle Ownership/Lease (${input.numVehicles} car${input.numVehicles > 1 ? "s" : ""})`,
        amount: ownershipDeduction,
        source: "local",
        formLine: "13a",
        note: input.monthlyCarPayment > ownershipStd
          ? `Capped at standard $${ownershipStd}; actual payment $${input.monthlyCarPayment}`
          : undefined,
      });
    }
  }

  // ── Additional Expense Deductions (§707(b)(2)(A)(ii)) ────────────────────

  // Line 16: Taxes (payroll, self-employment, income)
  if (input.monthlyTaxes > 0) {
    deductions.push({ label: "Taxes (Payroll & Income)", amount: input.monthlyTaxes, source: "actual", formLine: "16" });
  }

  // Line 17: Mandatory payroll deductions involuntarily withheld
  if (input.monthlyInvoluntaryDeductions > 0) {
    deductions.push({
      label: "Involuntary Payroll Deductions (Retirement, Union Dues, Uniform)",
      amount: input.monthlyInvoluntaryDeductions,
      source: "actual",
      formLine: "17",
    });
  }

  // Line 18: Term life insurance premiums (for debtor's dependents)
  if (input.monthlyTermLifeInsurance > 0) {
    deductions.push({
      label: "Term Life Insurance Premiums",
      amount: input.monthlyTermLifeInsurance,
      source: "actual",
      formLine: "18",
    });
  }

  // Line 19: Education required for current job
  if (input.monthlyEducationEmployment > 0) {
    deductions.push({
      label: "Education (Employment-Related, Legally Required)",
      amount: input.monthlyEducationEmployment,
      source: "actual",
      formLine: "19",
    });
  }

  // Line 20: Childcare
  if (input.monthlyChildcare > 0) {
    deductions.push({ label: "Childcare", amount: input.monthlyChildcare, source: "actual", formLine: "20" });
  }

  // Line 21: Additional healthcare for chronically ill or disabled household member
  if (input.monthlyChronicHealthcare > 0) {
    deductions.push({
      label: "Additional Healthcare (Chronically Ill/Disabled, above National Standard)",
      amount: input.monthlyChronicHealthcare,
      source: "actual",
      formLine: "21",
      note: "Ongoing treatment costs above IRS out-of-pocket standard on Line 7",
    });
  }

  // Line 22: Telecommunications (capped at IRS allowance)
  if (input.monthlyTelecom > 0) {
    const telecomDeduction = Math.min(TELECOM_ALLOWANCE, input.monthlyTelecom);
    deductions.push({
      label: "Telecommunications (Phone, Internet)",
      amount: telecomDeduction,
      source: "actual",
      formLine: "22",
      note: input.monthlyTelecom > TELECOM_ALLOWANCE
        ? `Capped at IRS standard $${TELECOM_ALLOWANCE}; actual $${input.monthlyTelecom}`
        : undefined,
    });
  }

  // Line 25a: Health insurance premiums
  if (input.monthlyHealthInsurance > 0) {
    deductions.push({ label: "Health Insurance Premiums", amount: input.monthlyHealthInsurance, source: "actual", formLine: "25a" });
  }

  // Line 25c: Education expenses for dependent children (K-12)
  if (input.monthlyDependentChildEducation > 0) {
    deductions.push({
      label: "Dependent Children's Education (K-12, Legally Required)",
      amount: input.monthlyDependentChildEducation,
      source: "actual",
      formLine: "25c",
      note: "Tuition/fees for children under 18 attending private/charter school where legally required",
    });
  }

  // Line 25d: Additional food/clothing for special medical/dietary needs
  if (input.monthlySpecialDietFood > 0) {
    deductions.push({
      label: "Special Diet / Medical Food (Above National Standard)",
      amount: input.monthlySpecialDietFood,
      source: "actual",
      formLine: "25d",
      note: "Additional food costs above Line 6 standard due to disability, chronic illness, or medically required diet",
    });
  }

  // Line 25e: Court-ordered domestic support obligations
  if (input.monthlySupportObligations > 0) {
    deductions.push({ label: "Domestic Support Obligations (Court-Ordered)", amount: input.monthlySupportObligations, source: "actual", formLine: "25e" });
  }

  // Lines 24–26: Priority debt payments (back taxes, domestic support arrears)
  if (input.monthlyPriorityDebts > 0) {
    deductions.push({
      label: "Priority Debt Payments (Back Taxes, Support Arrears)",
      amount: input.monthlyPriorityDebts,
      source: "actual",
      formLine: "24-26",
    });

    // Line 27: Chapter 13 admin expenses (10% of priority debt payments)
    const adminExpense = Math.round(input.monthlyPriorityDebts * ADMIN_EXPENSE_MULTIPLIER);
    if (adminExpense > 0) {
      deductions.push({
        label: "Chapter 13 Administrative Expenses (10% of Priority Debts)",
        amount: adminExpense,
        source: "calculation",
        formLine: "27",
        note: `10% × $${input.monthlyPriorityDebts}`,
      });
    }
  }

  // Line 33: Other secured debt payments
  if (input.monthlyOtherSecuredDebt > 0) {
    deductions.push({ label: "Other Secured Debt Payments", amount: input.monthlyOtherSecuredDebt, source: "actual", formLine: "33" });
  }

  // 6. Monthly disposable income (Line 34 net)
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const monthlyDisposable = Math.max(0, cmi - totalDeductions);

  // 7. 60-month projection (§707(b)(2)(A)(i))
  const projected60Month = monthlyDisposable * 60;
  const threshold25Pct = input.totalUnsecuredDebt * 0.25;

  // 8. Outcome determination
  const presumptionOfAbuse =
    projected60Month >= ABUSE_THRESHOLD_HIGH ||
    (projected60Month >= ABUSE_THRESHOLD_LOW && projected60Month >= threshold25Pct);

  let outcome: "PASS" | "FAIL" | "BORDERLINE";
  if (projected60Month < ABUSE_THRESHOLD_LOW) {
    outcome = "PASS";
  } else if (projected60Month >= ABUSE_THRESHOLD_HIGH) {
    outcome = "FAIL";
  } else if (projected60Month >= threshold25Pct) {
    outcome = "FAIL";
  } else {
    // Above low threshold, below high, below 25% of unsecured → borderline
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
