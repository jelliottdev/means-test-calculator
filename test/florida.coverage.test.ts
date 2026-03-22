import { countyNamesMatch } from "../src/lib/countyName";
import test from "node:test";
import assert from "node:assert/strict";
import { getEmbeddedDatasetBundle } from "../src/datasets/embedded";
import { runMeansTestFromBundle } from "../src/engine/v2/meansTestFromBundle";
import { runMeansTestV2 } from "../src/engine/v2/meansTestV2";
import type { MeansTestInputV2 } from "../src/engine/v2/types";

function createFloridaInput(overrides: Partial<MeansTestInputV2> = {}): MeansTestInputV2 {
  return {
    filingDate: "2026-04-01",
    state: "FL",
    county: "Miami-Dade",
    householdSize: 2,
    isJointFiling: false,
    incomeSources: [{ type: "Wages/Salary", monthlyAmount: 12000, includedInCmi: true }],
    primaryOver65: false,
    spouseOver65: false,
    vehicles: [
      { id: "vehicle-1", hasLoanOrLease: true, monthlyPayment: 700, operatingEligible: true },
    ],
    monthlyMortgageRent: 2500,
    monthlyTaxes: 1000,
    monthlyInvoluntaryDeductions: 0,
    monthlyTermLifeInsurance: 0,
    monthlyEducationEmployment: 0,
    monthlyTelecom: 0,
    monthlyHealthInsurance: 0,
    monthlyChildcare: 0,
    monthlyChronicHealthcare: 0,
    monthlyDependentChildEducation: 0,
    monthlySpecialDietFood: 0,
    monthlySupportObligations: 0,
    monthlyPriorityDebts: 0,
    monthlyOtherSecuredDebt: 0,
    totalUnsecuredDebt: 20000,
    debtType: "consumer",
    isDisabledVeteran: false,
    isActiveReservist: false,
    ...overrides,
  };
}

test("embedded bundle includes nationwide county coverage including all 67 Florida county overrides", () => {
  const bundle = getEmbeddedDatasetBundle("2026-04-01");

  assert.ok(bundle.median_income.data.FL);
  assert.ok(bundle.housing.state_defaults.FL);
  assert.equal(bundle.housing.county_overrides?.length, 3145);
  assert.equal(bundle.housing.county_overrides?.filter((county) => county.state === "FL").length, 67);
  assert.ok(bundle.housing.county_overrides?.some((county) => county.state === "CA" && county.county === "Orange County"));
  assert.ok(
    bundle.housing.msa_overrides?.some(
      (msa) => msa.name === "Miami" && msa.counties.FL?.includes("Miami-Dade")
    )
  );
  assert.ok(bundle.transportation.regions.South.msas.Miami.counties.FL?.includes("Miami-Dade"));
});

test("Florida Miami-Dade calculation uses exact county housing and Miami transport standards", () => {
  const bundle = getEmbeddedDatasetBundle("2026-04-01");
  const result = runMeansTestFromBundle(createFloridaInput(), bundle);

  assert.notEqual(result.outcome, "EXEMPT");
  assert.notEqual(result.outcome, "BELOW_MEDIAN");

  const miamiHousing = bundle.housing.county_overrides?.find(
    (county) => county.state === "FL" && countyNamesMatch(county.county, "Miami-Dade")
  );
  assert.ok(miamiHousing);

  const housingUtility = result.deductions.find((line) => line.formLine === "8a");
  const housingMortgage = result.deductions.find((line) => line.formLine === "8b");
  const transportOperating = result.deductions.find((line) => line.formLine === "12");

  assert.equal(housingUtility?.amount, miamiHousing.utility[1]);
  assert.equal(housingMortgage?.amount, miamiHousing.mortgage[1]);
  assert.equal(transportOperating?.amount, bundle.transportation.regions.South.msas.Miami.costs[0]);
});

test("embedded v2 engine does not warn for Miami-Dade exact county housing data", () => {
  const result = runMeansTestV2(createFloridaInput());
  assert.equal(
    result.audit.warnings.some((warning) => warning.includes("grouped Miami")),
    false
  );
});

test("embedded v2 engine does not warn for Hillsborough exact county housing data", () => {
  const result = runMeansTestV2(createFloridaInput({ county: "Hillsborough" }));
  assert.equal(
    result.audit.warnings.some((warning) => warning.includes("grouped Tampa")),
    false
  );
});


test("embedded v2 engine does not warn for Orange exact county housing data", () => {
  const result = runMeansTestV2(createFloridaInput({ county: "Orange" }));
  assert.equal(
    result.audit.warnings.some((warning) => warning.includes("grouped ")),
    false
  );
});


test("embedded v2 engine matches county-equivalent names like Anchorage Municipality from simple county input", () => {
  const result = runMeansTestV2(createFloridaInput({ state: "AK", county: "Anchorage", householdSize: 2 }));
  assert.equal(
    result.audit.warnings.some((warning) => warning.includes("statewide default") || warning.includes("grouped ")),
    false
  );
});

test("embedded v2 engine uses exact county housing for California Orange County", () => {
  const result = runMeansTestV2(createFloridaInput({ state: "CA", county: "Orange", householdSize: 2 }));
  assert.equal(
    result.audit.warnings.some((warning) => warning.includes("grouped ") || warning.includes("statewide default")),
    false
  );
});
