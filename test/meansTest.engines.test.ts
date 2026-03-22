import test from "node:test";
import assert from "node:assert/strict";
import { runMeansTest, type MeansTestInput } from "../src/engine/meansTest";
import { runMeansTestV2 } from "../src/engine/v2/meansTestV2";
import { EMBEDDED_MIN_SUPPORTED_FILING_DATE, getEmbeddedDatasetBundle, getEmbeddedDatasetSupport } from "../src/datasets/embedded";
import { buildAuditPacket, getAuditReviewStatus, getReviewerSignoffReasons, isReviewerSignoffRequired, normalizeAuditReview } from "../src/auditPacket";
import { runMeansTestFromBundle } from "../src/engine/v2/meansTestFromBundle";
import type { MeansTestDatasetBundle } from "../src/datasets/types";
import type { MeansTestInputV2 } from "../src/engine/v2/types";

function createLegacyInput(overrides: Partial<MeansTestInput> = {}): MeansTestInput {
  return {
    filingDate: "2026-04-01",
    state: "CA",
    county: "Los Angeles",
    householdSize: 2,
    isJointFiling: false,
    incomeSources: [{ type: "Wages/Salary", monthlyAmount: 12000 }],
    primaryOver65: false,
    spouseOver65: false,
    numVehicles: 2,
    hasCarPayment: true,
    monthlyCarPayment: 700,
    hasSecondCarPayment: true,
    monthlySecondCarPayment: 700,
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

function createV2Input(overrides: Partial<MeansTestInputV2> = {}): MeansTestInputV2 {
  return {
    filingDate: "2026-04-01",
    state: "CA",
    county: "",
    householdSize: 2,
    isJointFiling: false,
    incomeSources: [{ type: "Wages/Salary", monthlyAmount: 12000, includedInCmi: true }],
    primaryOver65: false,
    spouseOver65: false,
    vehicles: [
      { id: "vehicle-1", hasLoanOrLease: true, monthlyPayment: 700, operatingEligible: true },
      { id: "vehicle-2", hasLoanOrLease: true, monthlyPayment: 700, operatingEligible: true },
    ],
    monthlyMortgageRent: 0,
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

function createBundle(): MeansTestDatasetBundle {
  return {
    filing_date: "2025-11-01",
    median_income: {
      kind: "median_income",
      effective_date: "2025-11-01",
      source_url: "https://example.test/median",
      increment_over_4: 10000,
      data: { CA: [50000, 60000, 70000, 80000] },
    },
    national_standards: {
      kind: "national_standards",
      effective_date: "2025-11-01",
      source_url: "https://example.test/national",
      food_clothing: { "1": 500, "2": 900, "3": 1100, "4": 1300 },
      food_clothing_increment_over_4: 250,
      healthcare_under_65: 90,
      healthcare_65_and_over: 150,
      telecom_allowance: 200,
    },
    transportation: {
      kind: "transportation",
      effective_date: "2025-11-01",
      source_url: "https://example.test/transport",
      ownership_1_car: 500,
      ownership_2_car: 900,
      public_transport: 100,
      regions: {
        West: {
          states: ["CA"],
          regional: [250, 400],
          msas: {},
        },
      },
    },
    housing: {
      kind: "housing",
      effective_date: "2025-11-01",
      source_url: "https://example.test/housing",
      state_defaults: {
        CA: {
          utility: [400, 500, 600, 700, 800],
          mortgage: [1000, 1200, 1400, 1600, 1800],
        },
      },
      msa_overrides: [],
    },
    thresholds: {
      kind: "thresholds",
      effective_date: "2025-11-01",
      source_url: "https://example.test/thresholds",
      abuse_threshold_low: 9000,
      abuse_threshold_high: 15000,
      admin_expense_multiplier: 0.1,
    },
  };
}

test("legacy engine applies separate ownership caps for vehicle 1 and vehicle 2", () => {
  const result = runMeansTest(createLegacyInput());
  assert.notEqual(result.outcome, "EXEMPT");
  assert.notEqual(result.outcome, "BELOW_MEDIAN");

  const ownershipLines = result.deductions.filter((line) => line.formLine === "13c" || line.formLine === "13f");
  assert.equal(ownershipLines.length, 2);
  assert.deepEqual(
    ownershipLines.map((line) => line.amount),
    [0, 0]
  );
});



test("vehicle ownership deductions use net line 13c/13f math from the reviewed form", () => {
  const legacy = runMeansTest(createLegacyInput());
  assert.notEqual(legacy.outcome, "EXEMPT");
  assert.notEqual(legacy.outcome, "BELOW_MEDIAN");
  const legacyByLine = new Map(legacy.deductions.map((line) => [line.formLine, line]));
  assert.equal(legacyByLine.get("13c")?.amount, 0);
  assert.equal(legacyByLine.get("13f")?.amount, 0);

  const v2 = runMeansTestV2(createV2Input({ county: "Orange", state: "CA" }));
  const v2ByLine = new Map(v2.deductions.map((line) => [line.formLine, line]));
  assert.equal(v2ByLine.get("13c")?.amount, 0);
  assert.equal(v2ByLine.get("13f")?.amount, 0);
});

test("engines map reviewed Official Form 122A-2 lines 19-23 to the correct deductions", () => {
  const legacy = runMeansTest(createLegacyInput({
    monthlySupportObligations: 150,
    monthlyEducationEmployment: 125,
    monthlyChildcare: 300,
    monthlyChronicHealthcare: 75,
    monthlyTelecom: 250,
  }));
  assert.notEqual(legacy.outcome, "EXEMPT");
  assert.notEqual(legacy.outcome, "BELOW_MEDIAN");

  const byLine = new Map(legacy.deductions.map((line) => [line.formLine, line]));
  assert.equal(byLine.get("19")?.label, "Court-Ordered Payments");
  assert.equal(byLine.get("20")?.label, "Education");
  assert.equal(byLine.get("21")?.label, "Childcare");
  assert.equal(byLine.get("22")?.label, "Additional Healthcare (Excluding Insurance Costs)");
  assert.equal(byLine.get("23")?.label, "Optional Telephones and Telephone Services");
  assert.equal(byLine.get("23")?.amount, 195);

  const v2 = runMeansTestV2(createV2Input({
    county: "Orange",
    state: "CA",
    monthlySupportObligations: 150,
    monthlyEducationEmployment: 125,
    monthlyChildcare: 300,
    monthlyChronicHealthcare: 75,
    monthlyTelecom: 250,
  }));
  const v2ByLine = new Map(v2.deductions.map((line) => [line.formLine, line]));
  assert.equal(v2ByLine.get("19")?.label, "Court-Ordered Payments");
  assert.equal(v2ByLine.get("20")?.label, "Education");
  assert.equal(v2ByLine.get("21")?.label, "Childcare");
  assert.equal(v2ByLine.get("22")?.label, "Additional Healthcare (Excluding Insurance Costs)");
  assert.equal(v2ByLine.get("23")?.label, "Optional Telephones and Telephone Services");
  assert.equal(v2ByLine.get("23")?.amount, 195);
});

test("v2 engine emits warnings and assumptions for missing county and missing mortgage actual", () => {
  const result = runMeansTestV2(createV2Input());
  assert.ok(result.audit.warnings.some((warning) => warning.includes("County not provided")));
  assert.ok(result.audit.assumptions.some((assumption) => assumption.includes("Mortgage/rent actual amount not provided")));
});

test("bundle engine treats second-vehicle cap as incremental over first vehicle", () => {
  const result = runMeansTestFromBundle(createV2Input({ county: "Los Angeles" }), createBundle());
  assert.notEqual(result.outcome, "EXEMPT");
  assert.notEqual(result.outcome, "BELOW_MEDIAN");

  const ownershipLines = result.deductions.filter((line) => line.formLine === "13c" || line.formLine === "13f");
  assert.equal(ownershipLines.length, 2);
  assert.deepEqual(
    ownershipLines.map((line) => line.amount),
    [0, 0]
  );
});


test("embedded dataset bundle rejects unsupported filing dates before transportation coverage begins", () => {
  assert.throws(() => getEmbeddedDatasetBundle("2025-11-01"), /transportation begins 2026-04-01/i);
  assert.equal(EMBEDDED_MIN_SUPPORTED_FILING_DATE, "2026-04-01");
});



test("embedded dataset support reports manifest-backed resolution details", () => {
  const unsupported = getEmbeddedDatasetSupport("2025-11-15");
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.resolvedManifestDate, "2025-11-01");
  assert.match(unsupported.reason ?? "", /transportation begins 2026-04-01/i);

  const supported = getEmbeddedDatasetSupport("2026-04-15");
  assert.equal(supported.supported, true);
  assert.equal(supported.resolvedManifestDate, "2026-04-01");
});

test("v2 engine audit reflects the resolved embedded transportation effective date", () => {
  const result = runMeansTestV2(createV2Input({ county: "Orange", state: "CA" }));
  assert.equal(result.audit.datasets.transportation.effectiveDate, "2026-04-01");
  assert.equal(result.audit.datasets.housing.effectiveDate, "2025-11-01");
});




test("v2 engine warns when transportation falls back to regional costs", () => {
  const result = runMeansTestV2(createV2Input({ county: "Unknown County", state: "CA" }));
  assert.ok(result.audit.warnings.some((warning) => warning.includes("Transportation uses") && warning.includes("regional operating costs")));

  const operatingLine = result.deductions.find((line) => line.formLine === "12");
  assert.equal(operatingLine?.note?.startsWith("regional:"), true);
});


test("v2 engine does not warn when transportation resolves to an exact county/MSA match", () => {
  const result = runMeansTestV2(createV2Input({ county: "Orange", state: "CA" }));
  assert.equal(result.audit.warnings.some((warning) => warning.includes("regional operating costs")), false);

  const operatingLine = result.deductions.find((line) => line.formLine === "12");
  assert.equal(operatingLine?.note?.startsWith("msa:"), true);
});

test("v2 audit exposes embedded source hashes for resolved datasets", () => {
  const result = runMeansTestV2(createV2Input({ county: "Orange", state: "CA" }));
  assert.equal(result.audit.datasets.housing.sourceHash?.startsWith("embedded-snapshot:"), true);
  assert.equal(result.audit.datasets.transportation.sourceHash?.startsWith("embedded-snapshot:"), true);
  assert.equal(result.audit.datasets.transportation.notes?.length ?? 0, 0);
  assert.equal(result.audit.datasets.housing.notes?.length ?? 0, 0);
});


test("buildAuditPacket includes case summary, raw input, and resolved audit metadata", () => {
  const input = createLegacyInput({ filingDate: "2026-04-01", county: "Orange", state: "CA" });
  const result = runMeansTestV2(createV2Input({ filingDate: input.filingDate, county: input.county, state: input.state }));
  const packet = buildAuditPacket(input, result, "2026-03-22T00:00:00.000Z");

  assert.equal(packet.schemaVersion, "1.0");
  assert.equal(packet.exportedAt, "2026-03-22T00:00:00.000Z");
  assert.equal(packet.caseSummary.filingDate, "2026-04-01");
  assert.equal(packet.caseSummary.county, "Orange");
  assert.equal(packet.input.state, "CA");
  assert.equal(packet.result.audit.datasets.housing.sourceHash?.startsWith("embedded-snapshot:"), true);
});

test("buildAuditPacket includes reviewer signoff metadata when provided", () => {
  const input = createLegacyInput({ filingDate: "2026-04-01", county: "Orange", state: "CA" });
  const result = runMeansTestV2(createV2Input({ filingDate: input.filingDate, county: input.county, state: input.state }));
  const packet = buildAuditPacket(
    input,
    result,
    "2026-03-22T00:00:00.000Z",
    { reviewerName: "A. Reviewer", reviewerNotes: "Verified county and filing date", reviewedAt: "2026-03-22T00:05:00.000Z" },
  );

  assert.equal(packet.review?.reviewerName, "A. Reviewer");
  assert.equal(packet.review?.reviewerNotes, "Verified county and filing date");
  assert.equal(packet.review?.reviewedAt, "2026-03-22T00:05:00.000Z");
  assert.ok(packet.reviewRequirements.includes("Audit assumptions were used."));
  assert.equal(packet.reviewStatus.readyForExport, true);
  assert.equal(packet.reviewStatus.completedBy, "A. Reviewer");
  assert.equal(packet.reviewStatus.completedAt, "2026-03-22T00:05:00.000Z");
});


test("isReviewerSignoffRequired requires signoff for warnings and non-pass outcomes", () => {
  const warned = runMeansTestV2(createV2Input({ county: "" }));
  assert.equal(isReviewerSignoffRequired(warned), true);

  const exactCountyPass = runMeansTestV2(createV2Input({ county: "Orange", state: "CA" }));
  assert.equal(isReviewerSignoffRequired(exactCountyPass), true);

  const exempt = runMeansTestV2(createV2Input({ debtType: "business" }));
  assert.equal(isReviewerSignoffRequired(exempt), false);
});


test("getReviewerSignoffReasons explains why export signoff is required", () => {
  const warned = runMeansTestV2(createV2Input({ county: "" }));
  assert.ok(getReviewerSignoffReasons(warned).includes("Audit warnings are present."));
  assert.ok(getReviewerSignoffReasons(warned).includes("Audit assumptions were used."));

  const exempt = runMeansTestV2(createV2Input({ debtType: "business" }));
  assert.deepEqual(getReviewerSignoffReasons(exempt), []);
});


test("getAuditReviewStatus reports export blockers when reviewer signoff fields are missing", () => {
  const warned = runMeansTestV2(createV2Input({ county: "" }));
  const status = getAuditReviewStatus(warned);
  assert.equal(status.signoffRequired, true);
  assert.equal(status.readyForExport, false);
  assert.ok(status.blockers.includes("Reviewer name is missing."));
  assert.ok(status.blockers.includes("Reviewer notes are missing."));
});


test("getAuditReviewStatus is ready once required reviewer fields are complete", () => {
  const warned = runMeansTestV2(createV2Input({ county: "" }));
  const review = normalizeAuditReview({
    reviewerName: "  A. Reviewer  ",
    reviewerNotes: "  Confirmed county fallback warning with counsel.  ",
    reviewedAt: "2026-03-22T00:05:00.000Z",
  });

  const status = getAuditReviewStatus(warned, review);
  assert.equal(status.readyForExport, true);
  assert.deepEqual(status.blockers, []);
  assert.equal(status.completedBy, "A. Reviewer");
  assert.equal(status.completedAt, "2026-03-22T00:05:00.000Z");
});
