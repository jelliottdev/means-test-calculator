import { countyNamesMatch } from "../../lib/countyName";
import type { MeansTestDatasetBundle } from "../../datasets/types";
import type { CalculationAudit, LineItemV2, MeansTestInputV2, MeansTestResultV2 } from "./types";

function getOwnershipCapForVehicle(vehicleIndex: number, ownership1Car: number, ownership2CarTotal: number): number {
  if (vehicleIndex <= 0) return ownership1Car;
  return Math.max(0, ownership2CarTotal - ownership1Car);
}

function buildAudit(input: MeansTestInputV2, bundle: MeansTestDatasetBundle, assumptions: string[], warnings: string[]): CalculationAudit {
  return {
    filingDate: input.filingDate,
    datasets: {
      median_income: {
        key: bundle.median_income.kind,
        effectiveDate: bundle.median_income.effective_date,
        periodLabel: bundle.median_income.coverage ?? bundle.median_income.effective_date,
        sourceUrl: bundle.median_income.source_url,
        sourceHash: bundle.median_income.source_hash,
        fetchedAt: bundle.median_income.fetched_at,
        notes: bundle.median_income.warnings,
      },
      national_standards: {
        key: bundle.national_standards.kind,
        effectiveDate: bundle.national_standards.effective_date,
        periodLabel: bundle.national_standards.coverage ?? bundle.national_standards.effective_date,
        sourceUrl: bundle.national_standards.source_url,
        sourceHash: bundle.national_standards.source_hash,
        fetchedAt: bundle.national_standards.fetched_at,
        notes: bundle.national_standards.warnings,
      },
      transportation: {
        key: bundle.transportation.kind,
        effectiveDate: bundle.transportation.effective_date,
        periodLabel: bundle.transportation.coverage ?? bundle.transportation.effective_date,
        sourceUrl: bundle.transportation.source_url,
        sourceHash: bundle.transportation.source_hash,
        fetchedAt: bundle.transportation.fetched_at,
        notes: bundle.transportation.warnings,
      },
      housing: {
        key: bundle.housing.kind,
        effectiveDate: bundle.housing.effective_date,
        periodLabel: bundle.housing.coverage ?? bundle.housing.effective_date,
        sourceUrl: bundle.housing.source_url,
        sourceHash: bundle.housing.source_hash,
        fetchedAt: bundle.housing.fetched_at,
        notes: bundle.housing.warnings,
      },
      thresholds: {
        key: bundle.thresholds.kind,
        effectiveDate: bundle.thresholds.effective_date,
        periodLabel: bundle.thresholds.coverage ?? bundle.thresholds.effective_date,
        sourceUrl: bundle.thresholds.source_url,
        sourceHash: bundle.thresholds.source_hash,
        fetchedAt: bundle.thresholds.fetched_at,
        notes: bundle.thresholds.warnings,
      },
    },
    assumptions,
    warnings,
    inputSummary: {
      incomeSourcesIncluded: input.incomeSources.filter((s) => s.includedInCmi !== false).length,
      vehicleCount: input.vehicles.length,
      countyProvided: input.county.trim().length > 0,
    },
  };
}

function getHousingAllowanceFromBundle(bundle: MeansTestDatasetBundle, state: string, county: string, householdSize: number) {
  const idx = Math.min(householdSize, 5) - 1;
  for (const countyOverride of bundle.housing.county_overrides ?? []) {
    if (countyOverride.state === state && countyNamesMatch(countyOverride.county, county)) {
      return { utility: countyOverride.utility[idx], mortgageCap: countyOverride.mortgage[idx], matched: `county:${countyOverride.county}` };
    }
  }
  for (const msa of bundle.housing.msa_overrides ?? []) {
    const msaCounties = msa.counties[state];
    if (msaCounties?.some((c) => countyNamesMatch(c, county))) {
      return { utility: msa.utility[idx], mortgageCap: msa.mortgage[idx], matched: `msa:${msa.name}` };
    }
  }
  const std = bundle.housing.state_defaults[state];
  if (!std) {
    return { utility: 400, mortgageCap: 950, matched: "fallback" };
  }
  return { utility: std.utility[idx], mortgageCap: std.mortgage[idx], matched: "state_default" };
}

function getTransportOperatingCostFromBundle(bundle: MeansTestDatasetBundle, state: string, county: string, numCars: number) {
  const idx = numCars >= 2 ? 1 : 0;
  for (const [regionName, region] of Object.entries(bundle.transportation.regions)) {
    if (!region.states.includes(state)) continue;
    for (const [msaName, msa] of Object.entries(region.msas)) {
      const counties = msa.counties[state];
      if (counties?.some((c) => countyNamesMatch(c, county))) {
        return { amount: msa.costs[idx], matched: `msa:${msaName}`, region: regionName };
      }
    }
    return { amount: region.regional[idx], matched: `regional:${regionName}`, region: regionName };
  }
  return { amount: 281, matched: "fallback", region: undefined };
}

export function runMeansTestFromBundle(input: MeansTestInputV2, bundle: MeansTestDatasetBundle): MeansTestResultV2 {
  const assumptions: string[] = [];
  const warnings: string[] = [];

  if (input.isDisabledVeteran && input.debtType !== "business") {
    return {
      outcome: "EXEMPT",
      reason: "Disabled veteran exemption (11 U.S.C. § 707(b)(2)(D))",
      audit: buildAudit(input, bundle, assumptions, warnings),
    };
  }
  if (input.isActiveReservist) {
    return {
      outcome: "EXEMPT",
      reason: "Active duty/reservist exemption (11 U.S.C. § 707(b)(2)(D))",
      audit: buildAudit(input, bundle, assumptions, warnings),
    };
  }
  if (input.debtType === "business") {
    return {
      outcome: "EXEMPT",
      reason: "Primarily business debts — means test not required (11 U.S.C. § 707(b)(2))",
      audit: buildAudit(input, bundle, assumptions, warnings),
    };
  }

  const cmi = input.incomeSources.filter((s) => s.includedInCmi !== false).reduce((sum, s) => sum + s.monthlyAmount, 0);
  const annualizedCmi = cmi * 12;

  const medians = bundle.median_income.data[input.state];
  if (!medians) throw new Error(`Unknown state: ${input.state}`);
  const sizeIdx = Math.min(input.householdSize, 4) - 1;
  let stateMedian = medians[sizeIdx];
  if (input.householdSize > 4) {
    stateMedian += (input.householdSize - 4) * bundle.median_income.increment_over_4;
  }

  if (!input.county.trim()) warnings.push("County not provided; statewide or regional fallback may apply.");

  if (annualizedCmi <= stateMedian) {
    return {
      outcome: "BELOW_MEDIAN",
      cmi,
      annualizedCmi,
      stateMedian,
      deductions: [],
      audit: buildAudit(input, bundle, assumptions, warnings),
    };
  }

  const deductions: LineItemV2[] = [];
  const foodKey = input.householdSize <= 4 ? String(input.householdSize) : "4";
  const foodClothing = input.householdSize <= 4
    ? bundle.national_standards.food_clothing[foodKey]
    : bundle.national_standards.food_clothing["4"] + ((input.householdSize - 4) * bundle.national_standards.food_clothing_increment_over_4);
  deductions.push({ label: "Food, Clothing & Other Items (National Standard)", amount: foodClothing, source: "national", formLine: "6", datasetKey: "national_standards" });

  const adultCount = input.isJointFiling ? 2 : 1;
  const dependents = Math.max(0, input.householdSize - adultCount);
  const totalHC =
    (input.primaryOver65 ? bundle.national_standards.healthcare_65_and_over : bundle.national_standards.healthcare_under_65) +
    (input.isJointFiling ? (input.spouseOver65 ? bundle.national_standards.healthcare_65_and_over : bundle.national_standards.healthcare_under_65) : 0) +
    (dependents * bundle.national_standards.healthcare_under_65);
  deductions.push({ label: "Out-of-Pocket Healthcare (National Standard)", amount: totalHC, source: "national", formLine: "7", datasetKey: "national_standards" });

  const housing = getHousingAllowanceFromBundle(bundle, input.state, input.county, input.householdSize);
  if (housing.matched.startsWith("msa:")) warnings.push(`Housing uses grouped ${housing.matched.slice(4)} override for ${input.county || input.state}; verify the exact county row on the current U.S. Trustee housing chart.`);
  if (housing.matched === "state_default") warnings.push("Housing uses a statewide default instead of an exact county row; verify the current U.S. Trustee county chart before filing.");
  if (housing.matched === "fallback") warnings.push("Housing used the absolute fallback allowance because no state dataset matched; do not rely on this result without correcting the data.");
  deductions.push({ label: "Housing: Non-Mortgage Expenses (Local Standard)", amount: housing.utility, source: "local", formLine: "8a", datasetKey: "housing", note: housing.matched });
  const actualMortgage = input.monthlyMortgageRent;
  const mortgageDeduction = actualMortgage > 0 ? Math.min(housing.mortgageCap, actualMortgage) : housing.mortgageCap;
  if (actualMortgage === 0) assumptions.push("Mortgage/rent actual amount not provided; used IRS mortgage/rent cap for Line 8b.");
  deductions.push({ label: "Housing: Mortgage/Rent (Local Standard Cap)", amount: mortgageDeduction, source: "local", formLine: "8b", datasetKey: "housing" });

  if (input.vehicles.length === 0) {
    deductions.push({ label: "Public Transportation (National Standard)", amount: bundle.transportation.public_transport, source: "national", formLine: "14", datasetKey: "transportation" });
  } else {
    const numVehicles = Math.min(input.vehicles.length, 2);
    const transport = getTransportOperatingCostFromBundle(bundle, input.state, input.county, numVehicles);
    if (transport.matched.startsWith("regional:")) warnings.push(`Transportation uses ${transport.region} regional operating costs instead of an exact MSA/county match; verify the current IRS transportation chart before filing.`);
    if (transport.matched === "fallback") warnings.push("Transportation used the absolute fallback operating cost because no regional dataset matched; do not rely on this result without correcting the data.");
    deductions.push({ label: `Vehicle Operating Costs (${numVehicles} car${numVehicles > 1 ? "s" : ""}, Local Standard)`, amount: transport.amount, source: "local", formLine: "12", datasetKey: "transportation", note: transport.matched });
    input.vehicles.slice(0, 2).forEach((vehicle, idx) => {
      if (!vehicle.hasLoanOrLease || vehicle.monthlyPayment <= 0) return;
      const ownershipStd = getOwnershipCapForVehicle(
        idx,
        bundle.transportation.ownership_1_car,
        bundle.transportation.ownership_2_car
      );
      const ownershipDeduction = Math.max(0, ownershipStd - vehicle.monthlyPayment);
      deductions.push({
        label: `Net ${vehicle.id} Ownership / Lease Expense`,
        amount: ownershipDeduction,
        source: "local",
        formLine: idx === 0 ? "13c" : "13f",
        datasetKey: "transportation",
        note: `IRS standard $${ownershipStd} minus average monthly debt payment $${vehicle.monthlyPayment}`,
      });
    });
  }

  if (input.monthlyTaxes > 0) deductions.push({ label: "Taxes (Payroll & Income)", amount: input.monthlyTaxes, source: "actual", formLine: "16" });
  if (input.monthlyInvoluntaryDeductions > 0) deductions.push({ label: "Involuntary Payroll Deductions", amount: input.monthlyInvoluntaryDeductions, source: "actual", formLine: "17" });
  if (input.monthlyTermLifeInsurance > 0) deductions.push({ label: "Term Life Insurance Premiums", amount: input.monthlyTermLifeInsurance, source: "actual", formLine: "18" });
  if (input.monthlySupportObligations > 0) deductions.push({ label: "Court-Ordered Payments", amount: input.monthlySupportObligations, source: "actual", formLine: "19", note: "Current monthly payments required by court or administrative order" });
  if (input.monthlyEducationEmployment > 0) deductions.push({ label: "Education", amount: input.monthlyEducationEmployment, source: "actual", formLine: "20", note: "Only include education allowed by Official Form 122A-2 line 20" });
  if (input.monthlyChildcare > 0) deductions.push({ label: "Childcare", amount: input.monthlyChildcare, source: "actual", formLine: "21" });
  if (input.monthlyChronicHealthcare > 0) deductions.push({ label: "Additional Healthcare (Excluding Insurance Costs)", amount: input.monthlyChronicHealthcare, source: "actual", formLine: "22", note: "Only the amount above the Line 7 out-of-pocket standard" });
  if (input.monthlyTelecom > 0) deductions.push({ label: "Optional Telephones and Telephone Services", amount: Math.min(bundle.national_standards.telecom_allowance, input.monthlyTelecom), source: "actual", formLine: "23", datasetKey: "national_standards", note: input.monthlyTelecom > bundle.national_standards.telecom_allowance ? `Capped at IRS standard $${bundle.national_standards.telecom_allowance}; actual $${input.monthlyTelecom}` : "Do not include basic home phone, internet, or basic cell phone service" });
  if (input.monthlyHealthInsurance > 0) deductions.push({ label: "Health / Disability Insurance and Health Savings Account Expenses", amount: input.monthlyHealthInsurance, source: "actual", formLine: "25", note: "Enter the total actually spent for line 25 items" });
  if (input.monthlyDependentChildEducation > 0) deductions.push({ label: "Education Expenses for Dependent Children Under 18", amount: input.monthlyDependentChildEducation, source: "actual", formLine: "29", note: "Verify the current per-child cap and documentation requirements before filing" });
  if (input.monthlySpecialDietFood > 0) {
    const foodClothingCap = Math.round(foodClothing * 0.05 * 100) / 100;
    const allowedFoodClothing = Math.min(foodClothingCap, input.monthlySpecialDietFood);
    deductions.push({ label: "Additional Food and Clothing Expense", amount: allowedFoodClothing, source: "actual", formLine: "30", note: input.monthlySpecialDietFood > foodClothingCap ? `Capped at 5% of line 6 allowance ($${foodClothingCap.toFixed(2)}); actual $${input.monthlySpecialDietFood}` : "Subject to documentation and reasonableness requirements" });
  }
  if (input.monthlyPriorityDebts > 0) {
    deductions.push({ label: "Past-Due Priority Claims", amount: input.monthlyPriorityDebts, source: "actual", formLine: "35" });
    const adminExpense = Math.round(input.monthlyPriorityDebts * bundle.thresholds.admin_expense_multiplier);
    if (adminExpense > 0) deductions.push({ label: "Chapter 13 Administrative Expenses", amount: adminExpense, source: "calculation", formLine: "36", datasetKey: "thresholds" });
  }
  if (input.monthlyOtherSecuredDebt > 0) deductions.push({ label: "Other Secured Debt Payments", amount: input.monthlyOtherSecuredDebt, source: "actual", formLine: "33" });

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const monthlyDisposable = Math.max(0, cmi - totalDeductions);
  const projected60Month = monthlyDisposable * 60;
  const threshold25Pct = input.totalUnsecuredDebt * 0.25;
  const presumptionOfAbuse = projected60Month >= bundle.thresholds.abuse_threshold_high || (projected60Month >= bundle.thresholds.abuse_threshold_low && projected60Month >= threshold25Pct);

  let outcome: "PASS" | "FAIL" | "BORDERLINE";
  if (projected60Month < bundle.thresholds.abuse_threshold_low) outcome = "PASS";
  else if (projected60Month >= bundle.thresholds.abuse_threshold_high) outcome = "FAIL";
  else if (projected60Month >= threshold25Pct) outcome = "FAIL";
  else outcome = "BORDERLINE";

  return {
    outcome,
    cmi,
    annualizedCmi,
    stateMedian,
    deductions,
    totalDeductions,
    monthlyDisposable,
    projected60Month,
    abuseThresholdLow: bundle.thresholds.abuse_threshold_low,
    abuseThresholdHigh: bundle.thresholds.abuse_threshold_high,
    threshold25Pct,
    presumptionOfAbuse,
    audit: buildAudit(input, bundle, assumptions, warnings),
  };
}
