import test from "node:test";
import assert from "node:assert/strict";
import { runMeansTestV2 } from "../src/engine/v2/meansTestV2";
import type { MeansTestInput } from "../src/engine/meansTest";
import type { MeansTestInputV2 } from "../src/engine/v2/types";
import { canExportB122A2 } from "../src/forms/b122a2Eligibility";
import { projectB122A2Values } from "../src/forms/b122a2Projection";
import { B122A2_SIGNATURE_FIELDS, B122A2_TEXT_FIELD_MAP } from "../src/forms/b122a2FieldMap";
import { fillAcroFormText } from "../src/forms/fillAcroForm";

function createV2Input(overrides: Partial<MeansTestInputV2> = {}): MeansTestInputV2 {
  return {
    filingDate: "2026-04-01",
    state: "CA",
    county: "Los Angeles",
    householdSize: 2,
    isJointFiling: false,
    incomeSources: [{ type: "Wages/Salary", monthlyAmount: 12000, includedInCmi: true }],
    primaryOver65: false,
    spouseOver65: false,
    vehicles: [{ id: "vehicle-1", hasLoanOrLease: true, monthlyPayment: 500, operatingEligible: true }],
    monthlyMortgageRent: 1500,
    monthlyTaxes: 1000,
    monthlyInvoluntaryDeductions: 25,
    monthlyTermLifeInsurance: 20,
    monthlyEducationEmployment: 0,
    monthlyTelecom: 150,
    monthlyHealthInsurance: 50,
    monthlyChildcare: 0,
    monthlyChronicHealthcare: 0,
    monthlyDependentChildEducation: 0,
    monthlySpecialDietFood: 60,
    monthlySupportObligations: 0,
    monthlyPriorityDebts: 100,
    monthlyOtherSecuredDebt: 0,
    totalUnsecuredDebt: 20000,
    debtType: "consumer",
    isDisabledVeteran: false,
    isActiveReservist: false,
    ...overrides,
  };
}

function toLegacyInput(input: MeansTestInputV2): MeansTestInput {
  const firstVehicle = input.vehicles[0];
  const secondVehicle = input.vehicles[1];
  return {
    filingDate: input.filingDate,
    state: input.state,
    county: input.county,
    householdSize: input.householdSize,
    isJointFiling: input.isJointFiling,
    incomeSources: input.incomeSources.map((source) => ({ type: source.type, monthlyAmount: source.monthlyAmount })),
    primaryOver65: input.primaryOver65,
    spouseOver65: input.spouseOver65,
    numVehicles: (input.vehicles.length >= 2 ? 2 : input.vehicles.length) as 0 | 1 | 2,
    hasCarPayment: Boolean(firstVehicle?.hasLoanOrLease && firstVehicle.monthlyPayment > 0),
    monthlyCarPayment: firstVehicle?.monthlyPayment ?? 0,
    hasSecondCarPayment: Boolean(secondVehicle?.hasLoanOrLease && secondVehicle.monthlyPayment > 0),
    monthlySecondCarPayment: secondVehicle?.monthlyPayment ?? 0,
    monthlyMortgageRent: input.monthlyMortgageRent,
    monthlyTaxes: input.monthlyTaxes,
    monthlyInvoluntaryDeductions: input.monthlyInvoluntaryDeductions,
    monthlyTermLifeInsurance: input.monthlyTermLifeInsurance,
    monthlyEducationEmployment: input.monthlyEducationEmployment,
    monthlyTelecom: input.monthlyTelecom,
    monthlyHealthInsurance: input.monthlyHealthInsurance,
    monthlyChildcare: input.monthlyChildcare,
    monthlyChronicHealthcare: input.monthlyChronicHealthcare,
    monthlyDependentChildEducation: input.monthlyDependentChildEducation,
    monthlySpecialDietFood: input.monthlySpecialDietFood,
    monthlySupportObligations: input.monthlySupportObligations,
    monthlyPriorityDebts: input.monthlyPriorityDebts,
    monthlyOtherSecuredDebt: input.monthlyOtherSecuredDebt,
    totalUnsecuredDebt: input.totalUnsecuredDebt,
    debtType: input.debtType,
    isDisabledVeteran: input.isDisabledVeteran,
    isActiveReservist: input.isActiveReservist,
  };
}

test("projection computes key B122A-2 values from above-median result", () => {
  const inputV2 = createV2Input({ monthlySpecialDietFood: 1000 });
  const result = runMeansTestV2(inputV2);
  assert.notEqual(result.outcome, "EXEMPT");
  assert.notEqual(result.outcome, "BELOW_MEDIAN");

  const projection = projectB122A2Values(toLegacyInput(inputV2), result);
  assert.equal(projection.line1, result.cmi);
  assert.equal(projection.line38, result.totalDeductions);
  assert.equal(projection.line39d, result.projected60Month);
  assert.equal(projection.line30, 48.85);
});

test("signature fields are intentionally excluded from writable field map", () => {
  const mappedFieldNames = new Set(B122A2_TEXT_FIELD_MAP.map((entry) => entry.pdfFieldName));
  for (const signatureField of B122A2_SIGNATURE_FIELDS) {
    assert.equal(mappedFieldNames.has(signatureField), false);
  }
});

test("unsupported outcomes do not export B122A-2", () => {
  const exemptResult = runMeansTestV2(createV2Input({ debtType: "business" }));
  assert.equal(canExportB122A2(exemptResult), false);

  const belowMedianResult = runMeansTestV2(createV2Input({ incomeSources: [{ type: "Wages/Salary", monthlyAmount: 1000, includedInCmi: true }] }));
  assert.equal(belowMedianResult.outcome, "BELOW_MEDIAN");
  assert.equal(canExportB122A2(belowMedianResult), false);
});

test("AcroForm fill fails closed when a required field is missing", () => {
  const writes = new Map<string, string>();
  const form = {
    getFields: () => [{ getName: () => "Quest1" }],
    getTextField: (name: string) => ({
      setText: (value: string) => writes.set(name, value),
      enableReadOnly: () => undefined,
    }),
  };

  assert.throws(
    () => {
      fillAcroFormText(form as never, B122A2_TEXT_FIELD_MAP.slice(0, 2), (mapping) => (mapping.key === "line1" ? 1 : ""));
    },
    /required field 'Quest3A'/,
  );
});


test("AcroForm fill preserves integer fields without forced decimals", () => {
  const writes = new Map<string, string>();
  const form = {
    getFields: () => [{ getName: () => "Quest5" }],
    getTextField: (name: string) => ({
      setText: (value: string) => writes.set(name, value),
      enableReadOnly: () => undefined,
    }),
  };

  fillAcroFormText(
    form as never,
    [{ key: "line5", pdfFieldName: "Quest5", required: true, value: () => 3 }],
    (mapping) => mapping.value({} as never),
  );

  assert.equal(writes.get("Quest5"), "3");
});
