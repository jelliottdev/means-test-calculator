import { getEmbeddedDatasetBundle } from "../datasets/embedded";
import type { MeansTestInput } from "../engine/meansTest";
import type { MeansTestResultV2 } from "../engine/v2/types";

export type AboveMedianResult = Extract<MeansTestResultV2, { outcome: "PASS" | "FAIL" | "BORDERLINE" }>;

export interface B122A2Projection {
  line1: number;
  line3: number;
  line4: number;
  line5: number;
  line6: number;
  line7a: number;
  line7b: number;
  line7d: number;
  line7e: number;
  line7c: number;
  line7f: number;
  line7g: number;
  line8: number;
  line9a: number;
  line9b: number;
  line9c: number;
  line10: number;
  line12: number;
  line13a: number;
  line13b: number;
  line13c: number;
  line13d: number;
  line13e: number;
  line13f: number;
  line14: number;
  line15: number;
  line16: number;
  line17: number;
  line18: number;
  line19: number;
  line20: number;
  line21: number;
  line22: number;
  line23: number;
  line24: number;
  line25a: number;
  line25b: number;
  line25c: number;
  line25: number;
  line26: number;
  line27: number;
  line28: number;
  line29: number;
  line30: number;
  line31: number;
  line32: number;
  line33a: number;
  line33b: number;
  line33c: number;
  line33d: number;
  line33e: number;
  line34: number;
  line35: number;
  line36: number;
  line37: number;
  line38: number;
  line39a: number;
  line39b: number;
  line39c: number;
  line39d: number;
  line41a: number;
  line41b: number;
}

function getDeduction(result: AboveMedianResult, line: string): number {
  const deduction = result.deductions.find((item) => item.formLine === line);
  return deduction?.amount ?? 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function projectB122A2Values(input: MeansTestInput, result: AboveMedianResult): B122A2Projection {
  const bundle = getEmbeddedDatasetBundle(input.filingDate);
  const adultCount = input.isJointFiling ? 2 : 1;
  const dependents = Math.max(0, input.householdSize - adultCount);
  const count65Plus = (input.primaryOver65 ? 1 : 0) + (input.isJointFiling && input.spouseOver65 ? 1 : 0);
  const countUnder65 = Math.max(0, adultCount - count65Plus) + dependents;

  const line1 = result.cmi;
  const line3 = 0;
  const line4 = line1 - line3;
  const line5 = input.householdSize;

  const line6 = getDeduction(result, "6");
  const line7a = bundle.national_standards.healthcare_under_65;
  const line7b = countUnder65;
  const line7d = bundle.national_standards.healthcare_65_and_over;
  const line7e = count65Plus;
  const line7c = line7a * line7b;
  const line7f = line7d * line7e;
  const line7g = line7c + line7f;

  const line8 = getDeduction(result, "8a");
  const line9a = getDeduction(result, "8b");
  const line9b = 0;
  const line9c = line9a;
  const line10 = 0;

  const line12 = getDeduction(result, "12");
  const line13b = input.hasCarPayment ? input.monthlyCarPayment : 0;
  const line13c = getDeduction(result, "13c");
  const line13a = line13b + line13c;
  const line13e = input.hasSecondCarPayment ? (input.monthlySecondCarPayment ?? 0) : 0;
  const line13f = getDeduction(result, "13f");
  const line13d = line13e + line13f;
  const line14 = getDeduction(result, "14");
  const line15 = 0;

  const line16 = input.monthlyTaxes;
  const line17 = input.monthlyInvoluntaryDeductions;
  const line18 = input.monthlyTermLifeInsurance;
  const line19 = input.monthlySupportObligations;
  const line20 = input.monthlyEducationEmployment;
  const line21 = input.monthlyChildcare;
  const line22 = input.monthlyChronicHealthcare;
  const line23 = Math.min(bundle.national_standards.telecom_allowance, input.monthlyTelecom);
  const line24 = line6 + line7g + line8 + line9c + line10 + line12 + line13c + line13f + line14 + line15 + line16 + line17 + line18 + line19 + line20 + line21 + line22 + line23;

  const line25a = input.monthlyHealthInsurance;
  const line25b = 0;
  const line25c = 0;
  const line25 = line25a + line25b + line25c;
  const line26 = 0;
  const line27 = 0;
  const line28 = 0;
  const line29 = input.monthlyDependentChildEducation;
  const line30 = Math.min(input.monthlySpecialDietFood, roundCurrency(line6 * 0.05));
  const line31 = 0;
  const line32 = line25 + line26 + line27 + line28 + line29 + line30 + line31;

  const line33a = 0;
  const line33b = line13b;
  const line33c = line13e;
  const line33d = input.monthlyOtherSecuredDebt;
  const line33e = line33a + line33b + line33c + line33d;
  const line34 = 0;
  const line35 = input.monthlyPriorityDebts;
  const line36 = getDeduction(result, "36");
  const line37 = line33e + line34 + line35 + line36;

  const line38 = result.totalDeductions;
  const line39a = line4;
  const line39b = line38;
  const line39c = result.monthlyDisposable;
  const line39d = result.projected60Month;
  const line41a = input.totalUnsecuredDebt;
  const line41b = result.threshold25Pct;

  return {
    line1,
    line3,
    line4,
    line5,
    line6,
    line7a,
    line7b,
    line7d,
    line7e,
    line7c,
    line7f,
    line7g,
    line8,
    line9a,
    line9b,
    line9c,
    line10,
    line12,
    line13a,
    line13b,
    line13c,
    line13d,
    line13e,
    line13f,
    line14,
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25a,
    line25b,
    line25c,
    line25,
    line26,
    line27,
    line28,
    line29,
    line30,
    line31,
    line32,
    line33a,
    line33b,
    line33c,
    line33d,
    line33e,
    line34,
    line35,
    line36,
    line37,
    line38,
    line39a,
    line39b,
    line39c,
    line39d,
    line41a,
    line41b,
  };
}
