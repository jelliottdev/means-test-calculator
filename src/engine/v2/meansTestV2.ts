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
} from "../../data/meansTestData";
import { getDatasetRegistrySnapshot } from "./registry";
import type { CalculationAudit, LineItemV2, MeansTestInputV2, MeansTestResultV2 } from "./types";

function buildAudit(input: MeansTestInputV2, assumptions: string[], warnings: string[]): CalculationAudit {
  return {
    filingDate: input.filingDate,
    datasets: getDatasetRegistrySnapshot(),
    assumptions,
    warnings,
    inputSummary: {
      incomeSourcesIncluded: input.incomeSources.filter((s) => s.includedInCmi !== false).length,
      vehicleCount: input.vehicles.length,
      countyProvided: input.county.trim().length > 0,
    },
  };
}

export function runMeansTestV2(input: MeansTestInputV2): MeansTestResultV2 {
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (input.isDisabledVeteran && input.debtType !== "business") {
    return {
      outcome: "EXEMPT",
      reason: "Disabled veteran exemption (11 U.S.C. § 707(b)(2)(D))",
      audit: buildAudit(input, assumptions, warnings),
    };
  }
  if (input.isActiveReservist) {
    return {
      outcome: "EXEMPT",
      reason: "Active duty/reservist exemption (11 U.S.C. § 707(b)(2)(D))",
      audit: buildAudit(input, assumptions, warnings),
    };
  }
  if (input.debtType === "business") {
    return {
      outcome: "EXEMPT",
      reason: "Primarily business debts — means test not required (11 U.S.C. § 707(b)(2))",
      audit: buildAudit(input, assumptions, warnings),
    };
  }

  const cmi = input.incomeSources
    .filter((s) => s.includedInCmi !== false)
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
  const annualizedCmi = cmi * 12;

  const medians = STATE_MEDIAN_INCOME[input.state];
  if (!medians) {
    throw new Error(`Unknown state: ${input.state}`);
  }

  const sizeIdx = Math.min(input.householdSize, 4) - 1;
  let stateMedian = medians[sizeIdx];
  if (input.householdSize > 4) {
    stateMedian += (input.householdSize - 4) * INCOME_INCREMENT_PER_PERSON_OVER_4;
  }

  if (!input.county.trim()) {
    warnings.push("County not provided; regional or statewide local-standard fallback may apply.");
  }

  if (annualizedCmi <= stateMedian) {
    return {
      outcome: "BELOW_MEDIAN",
      cmi,
      annualizedCmi,
      stateMedian,
      deductions: [],
      audit: buildAudit(input, assumptions, warnings),
    };
  }

  const deductions: LineItemV2[] = [];

  const foodClothing = input.householdSize <= 4
    ? NATIONAL_FOOD_CLOTHING[input.householdSize]
    : NATIONAL_FOOD_CLOTHING[4] + (input.householdSize - 4) * NATIONAL_FOOD_CLOTHING_PER_PERSON_OVER_4;
  deductions.push({
    label: "Food, Clothing & Other Items (National Standard)",
    amount: foodClothing,
    source: "national",
    formLine: "6",
    datasetKey: "national_standards",
  });

  const adultCount = input.isJointFiling ? 2 : 1;
  const dependents = Math.max(0, input.householdSize - adultCount);
  const primaryHC = input.primaryOver65 ? HEALTHCARE_STANDARD_65_AND_OVER : HEALTHCARE_STANDARD_UNDER_65;
  const spouseHC = input.isJointFiling
    ? (input.spouseOver65 ? HEALTHCARE_STANDARD_65_AND_OVER : HEALTHCARE_STANDARD_UNDER_65)
    : 0;
  const depHC = dependents * HEALTHCARE_STANDARD_UNDER_65;
  const totalHC = primaryHC + spouseHC + depHC;
  deductions.push({
    label: "Out-of-Pocket Healthcare (National Standard)",
    amount: totalHC,
    source: "national",
    formLine: "7",
    datasetKey: "national_standards",
  });

  const { utility, mortgageCap } = getHousingAllowance(input.state, input.county, input.householdSize);
  deductions.push({
    label: "Housing: Non-Mortgage Expenses (Local Standard)",
    amount: utility,
    source: "local",
    formLine: "8a",
    datasetKey: "housing",
  });

  const actualMortgage = input.monthlyMortgageRent;
  const mortgageDeduction = actualMortgage > 0 ? Math.min(mortgageCap, actualMortgage) : mortgageCap;
  if (actualMortgage === 0) {
    assumptions.push("Mortgage/rent actual amount not provided; used IRS mortgage/rent cap for Line 8b.");
  }
  deductions.push({
    label: "Housing: Mortgage/Rent (Local Standard Cap)",
    amount: mortgageDeduction,
    source: "local",
    formLine: "8b",
    datasetKey: "housing",
    note: actualMortgage === 0
      ? "Using IRS cap (no actual provided)"
      : actualMortgage > mortgageCap
        ? `Capped at IRS standard $${mortgageCap}; actual $${actualMortgage}`
        : `Actual $${actualMortgage} (below IRS cap $${mortgageCap})`,
  });

  if (input.vehicles.length === 0) {
    deductions.push({
      label: "Public Transportation (National Standard)",
      amount: TRANSPORT_PUBLIC,
      source: "national",
      formLine: "14",
      datasetKey: "transportation",
      note: "No vehicle — nationwide public transit allowance",
    });
  } else {
    const numVehicles = Math.min(input.vehicles.length, 2);
    const operatingCost = getTransportOperatingCost(input.state, input.county, numVehicles);
    deductions.push({
      label: `Vehicle Operating Costs (${numVehicles} car${numVehicles > 1 ? "s" : ""}, Local Standard)`,
      amount: operatingCost,
      source: "local",
      formLine: "12",
      datasetKey: "transportation",
    });

    input.vehicles.slice(0, 2).forEach((vehicle, idx) => {
      if (!vehicle.hasLoanOrLease || vehicle.monthlyPayment <= 0) return;
      const ownershipStd = idx === 0 ? TRANSPORT_OWNERSHIP_1_CAR : TRANSPORT_OWNERSHIP_1_CAR;
      const ownershipDeduction = Math.min(ownershipStd, vehicle.monthlyPayment);
      deductions.push({
        label: `Vehicle Ownership/Lease (${vehicle.id})`,
        amount: ownershipDeduction,
        source: "local",
        formLine: "13a",
        datasetKey: "transportation",
        note: vehicle.monthlyPayment > ownershipStd
          ? `Capped at standard $${ownershipStd}; actual payment $${vehicle.monthlyPayment}`
          : undefined,
      });
    });

    if (input.vehicles.length > 2) {
      warnings.push("Only the first two vehicles are used for ownership and operating deductions in the current engine.");
    }
  }

  if (input.monthlyTaxes > 0) deductions.push({ label: "Taxes (Payroll & Income)", amount: input.monthlyTaxes, source: "actual", formLine: "16" });
  if (input.monthlyInvoluntaryDeductions > 0) deductions.push({ label: "Involuntary Payroll Deductions", amount: input.monthlyInvoluntaryDeductions, source: "actual", formLine: "17" });
  if (input.monthlyTermLifeInsurance > 0) deductions.push({ label: "Term Life Insurance Premiums", amount: input.monthlyTermLifeInsurance, source: "actual", formLine: "18" });
  if (input.monthlyEducationEmployment > 0) deductions.push({ label: "Education (Employment-Related)", amount: input.monthlyEducationEmployment, source: "actual", formLine: "19" });
  if (input.monthlyChildcare > 0) deductions.push({ label: "Childcare", amount: input.monthlyChildcare, source: "actual", formLine: "20" });
  if (input.monthlyChronicHealthcare > 0) deductions.push({ label: "Additional Healthcare (Chronic/Disabled)", amount: input.monthlyChronicHealthcare, source: "actual", formLine: "21" });
  if (input.monthlyTelecom > 0) {
    const telecomDeduction = Math.min(TELECOM_ALLOWANCE, input.monthlyTelecom);
    deductions.push({
      label: "Telecommunications",
      amount: telecomDeduction,
      source: "actual",
      formLine: "22",
      datasetKey: "national_standards",
      note: input.monthlyTelecom > TELECOM_ALLOWANCE ? `Capped at IRS standard $${TELECOM_ALLOWANCE}` : undefined,
    });
  }
  if (input.monthlyHealthInsurance > 0) deductions.push({ label: "Health Insurance Premiums", amount: input.monthlyHealthInsurance, source: "actual", formLine: "25a" });
  if (input.monthlyDependentChildEducation > 0) deductions.push({ label: "Dependent Children's Education (K-12)", amount: input.monthlyDependentChildEducation, source: "actual", formLine: "25c" });
  if (input.monthlySpecialDietFood > 0) deductions.push({ label: "Special Diet / Medical Food", amount: input.monthlySpecialDietFood, source: "actual", formLine: "25d" });
  if (input.monthlySupportObligations > 0) deductions.push({ label: "Domestic Support Obligations", amount: input.monthlySupportObligations, source: "actual", formLine: "25e" });

  if (input.monthlyPriorityDebts > 0) {
    deductions.push({ label: "Priority Debt Payments", amount: input.monthlyPriorityDebts, source: "actual", formLine: "24-26" });
    const adminExpense = Math.round(input.monthlyPriorityDebts * ADMIN_EXPENSE_MULTIPLIER);
    if (adminExpense > 0) {
      deductions.push({
        label: "Chapter 13 Administrative Expenses",
        amount: adminExpense,
        source: "calculation",
        formLine: "27",
        datasetKey: "thresholds",
        note: `10% × $${input.monthlyPriorityDebts}`,
      });
    }
  }

  if (input.monthlyOtherSecuredDebt > 0) deductions.push({ label: "Other Secured Debt Payments", amount: input.monthlyOtherSecuredDebt, source: "actual", formLine: "33" });

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const monthlyDisposable = Math.max(0, cmi - totalDeductions);
  const projected60Month = monthlyDisposable * 60;
  const threshold25Pct = input.totalUnsecuredDebt * 0.25;

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
    audit: buildAudit(input, assumptions, warnings),
  };
}
