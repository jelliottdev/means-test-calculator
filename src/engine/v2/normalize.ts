import type { MeansTestInput } from "../meansTest";
import type { MeansTestInputV2, VehicleInput } from "./types";

function normalizeVehicles(input: MeansTestInput): VehicleInput[] {
  const numVehicles = Math.max(0, input.numVehicles || 0);
  if (numVehicles === 0) return [];

  const vehicles: VehicleInput[] = [];
  for (let i = 0; i < numVehicles; i += 1) {
    vehicles.push({
      id: `vehicle-${i + 1}`,
      hasLoanOrLease: i === 0 ? !!input.hasCarPayment : false,
      monthlyPayment: i === 0 ? input.monthlyCarPayment || 0 : 0,
      operatingEligible: true,
    });
  }
  return vehicles;
}

export function normalizeLegacyInput(input: MeansTestInput): MeansTestInputV2 {
  return {
    filingDate: input.filingDate,
    state: input.state,
    county: input.county,
    householdSize: input.householdSize,
    isJointFiling: input.isJointFiling,
    incomeSources: input.incomeSources.map((s) => ({
      type: s.type,
      monthlyAmount: s.monthlyAmount,
      includedInCmi: true,
    })),
    primaryOver65: input.primaryOver65,
    spouseOver65: input.spouseOver65,
    vehicles: normalizeVehicles(input),
    monthlyMortgageRent: input.monthlyMortgageRent,
    monthlyTaxes: input.monthlyTaxes,
    monthlyInvoluntaryDeductions: input.monthlyInvoluntaryDeductions ?? 0,
    monthlyTermLifeInsurance: input.monthlyTermLifeInsurance ?? 0,
    monthlyEducationEmployment: input.monthlyEducationEmployment ?? 0,
    monthlyTelecom: input.monthlyTelecom ?? 0,
    monthlyHealthInsurance: input.monthlyHealthInsurance,
    monthlyChildcare: input.monthlyChildcare,
    monthlyChronicHealthcare: input.monthlyChronicHealthcare ?? 0,
    monthlyDependentChildEducation: input.monthlyDependentChildEducation ?? 0,
    monthlySpecialDietFood: input.monthlySpecialDietFood ?? 0,
    monthlySupportObligations: input.monthlySupportObligations,
    monthlyPriorityDebts: input.monthlyPriorityDebts ?? 0,
    monthlyOtherSecuredDebt: input.monthlyOtherSecuredDebt,
    totalUnsecuredDebt: input.totalUnsecuredDebt,
    debtType: input.debtType,
    isDisabledVeteran: input.isDisabledVeteran,
    isActiveReservist: input.isActiveReservist,
  };
}
