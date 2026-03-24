
import { PDFDocument } from "pdf-lib";
import { getEmbeddedDatasetBundle } from "../datasets/embedded";
import type { MeansTestInput } from "../engine/meansTest";
import type { MeansTestResultV2 } from "../engine/v2/types";
import { B122A2_TEMPLATE_BASE64 } from "./b122a2TemplateBase64";

type FieldValue = string | number | boolean;

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function money(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function getDeduction(result: Extract<MeansTestResultV2, { deductions: unknown }>, line: string): number {
  const exact = result.deductions.find((item) => item.formLine === line);
  return exact?.amount ?? 0;
}

function sum(nums: number[]): number {
  return nums.reduce((total, value) => total + value, 0);
}

function setText(form: ReturnType<PDFDocument["getForm"]>, name: string, value: FieldValue): void {
  const field = form.getTextField(name);
  field.setText(typeof value === "boolean" ? (value ? "Yes" : "No") : String(value));
}

function maybeCheck(form: ReturnType<PDFDocument["getForm"]>, name: string, checked: boolean): void {
  if (!checked) return;
  try {
    form.getCheckBox(name).check();
  } catch {
    // unsupported checkbox name in this template revision
  }
}

function buildProjection(input: MeansTestInput, result: Extract<MeansTestResultV2, { outcome: "PASS" | "FAIL" | "BORDERLINE" }>) {
  const bundle = getEmbeddedDatasetBundle(input.filingDate);
  const adultCount = input.isJointFiling ? 2 : 1;
  const dependents = Math.max(0, input.householdSize - adultCount);
  const count65Plus = (input.primaryOver65 ? 1 : 0) + (input.isJointFiling && input.spouseOver65 ? 1 : 0);
  const countUnder65 = Math.max(0, adultCount - count65Plus) + dependents;

  const healthcareUnder65 = bundle.national_standards.healthcare_under_65;
  const healthcare65Plus = bundle.national_standards.healthcare_65_and_over;

  const line1 = result.cmi;
  const line3 = 0;
  const line4 = line1 - line3;

  const line6 = getDeduction(result, "6");
  const line7c = healthcareUnder65 * countUnder65;
  const line7f = healthcare65Plus * count65Plus;
  const line7g = line7c + line7f;

  const line8 = getDeduction(result, "8a");
  const line9a = getDeduction(result, "8b");
  const line9c = line9a;

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
  const line24 = sum([line6, line7g, line8, line9c, line12, line13c, line13f, line14, line15, line16, line17, line18, line19, line20, line21, line22, line23]);

  const line25Health = input.monthlyHealthInsurance;
  const line25Disability = 0;
  const line25Hsa = 0;
  const line25Total = line25Health;
  const line26 = 0;
  const line27 = 0;
  const line28 = 0;
  const line29 = input.monthlyDependentChildEducation;
  const line30 = Math.min(input.monthlySpecialDietFood, Math.round(line6 * 0.05 * 100) / 100);
  const line31 = 0;
  const line32 = sum([line25Total, line26, line27, line28, line29, line30, line31]);

  const line33a = 0;
  const line33b = line13b;
  const line33c = line13e;
  const line33d = input.monthlyOtherSecuredDebt;
  const line33e = sum([line33a, line33b, line33c, line33d]);
  const line34 = 0;
  const line35Monthly = input.monthlyPriorityDebts;
  const line36 = getDeduction(result, "36");
  const line37 = sum([line33e, line34, line35Monthly, line36]);

  const line38 = result.totalDeductions;
  const line39a = line4;
  const line39b = line38;
  const line39c = result.monthlyDisposable;
  const line39d = result.projected60Month;
  const line41a = input.totalUnsecuredDebt;
  const line41b = result.threshold25Pct;

  return {
    line1, line3, line4, line6, line7g, line8, line9a, line9c, line12, line13a, line13b, line13c, line13d, line13e, line13f, line14, line15, line16, line17, line18, line19, line20, line21, line22, line23, line24, line25Health, line25Disability, line25Hsa, line25Total, line26, line27, line28, line29, line30, line31, line32, line33a, line33b, line33c, line33d, line33e, line34, line35Monthly, line36, line37, line38, line39a, line39b, line39c, line39d, line41a, line41b, countUnder65, count65Plus, healthcareUnder65, healthcare65Plus,
  };
}

export async function exportB122A2Draft(input: MeansTestInput, result: MeansTestResultV2): Promise<void> {
  if (result.outcome === "EXEMPT" || result.outcome === "BELOW_MEDIAN") {
    throw new Error("Form 122A-2 export is only available for above-median calculations.");
  }

  const projection = buildProjection(input, result);
  const pdfDoc = await PDFDocument.load(decodeBase64(B122A2_TEMPLATE_BASE64));
  const form = pdfDoc.getForm();

  setText(form, "Quest1", money(projection.line1));
  setText(form, "Quest3A", "");
  setText(form, "Quest3A1", money(0));
  setText(form, "Quest3B", "");
  setText(form, "Quest3B1", money(0));
  setText(form, "Quest3C", "");
  setText(form, "Quest3C1", money(projection.line3));
  setText(form, "Quest5", input.householdSize);
  setText(form, "Quest6", money(projection.line6));
  setText(form, "Quest7A", money(projection.healthcareUnder65));
  setText(form, "Quest7B", projection.countUnder65);
  setText(form, "Quest7D", money(projection.healthcare65Plus));
  setText(form, "Quest7E", projection.count65Plus);
  setText(form, "Quest8", money(projection.line8));
  setText(form, "Quest9", money(projection.line9a));
  setText(form, "Quest9B creditor name1", "");
  setText(form, "Quest9B creditor amount1", money(0));
  setText(form, "Quest9B creditor name2", "");
  setText(form, "Quest9B creditor amount2", money(0));
  setText(form, "Quest9B creditor name3", "");
  setText(form, "Quest9B creditor amount3", money(0));
  setText(form, "Quest10", money(0));
  setText(form, "Explain 1", "");
  setText(form, "Explain 2", "");
  setText(form, "Quest12", money(projection.line12));
  setText(form, "Describe Vehicle 1 1", input.numVehicles >= 1 ? "Vehicle 1" : "");
  setText(form, "Describe Vehicle 1 2", "");
  setText(form, "Quest13A", money(projection.line13a));
  setText(form, "Quest13B Creditor for vehicle 1-1", input.hasCarPayment ? "Vehicle 1 debt" : "");
  setText(form, "Quest13B amount for vehicle 1-1", money(projection.line13b));
  setText(form, "Quest13B Creditor for vehicle 1-2", "");
  setText(form, "Quest13B amount for vehicle 1-2", money(0));
  setText(form, "Describe Vehicle 2 1", input.numVehicles >= 2 ? "Vehicle 2" : "");
  setText(form, "Describe Vehicle 2 2", "");
  setText(form, "Quest13D", money(projection.line13d));
  setText(form, "Creditor1", input.hasSecondCarPayment ? "Vehicle 2 debt" : "");
  setText(form, "Monthly1", money(projection.line13e));
  setText(form, "Creditor2", "");
  setText(form, "Monthly2", money(0));
  setText(form, "Quest14", money(projection.line14));
  setText(form, "Quest15", money(projection.line15));
  setText(form, "undefined_48", money(projection.line16));
  setText(form, "undefined_49", money(projection.line17));
  setText(form, "undefined_50", money(projection.line18));
  setText(form, "undefined_51", money(projection.line19));
  setText(form, "undefined_52", money(projection.line20));
  setText(form, "undefined_53", money(projection.line21));
  setText(form, "undefined_54", money(projection.line22));
  setText(form, "undefined_55", money(projection.line23));
  setText(form, "undefined_56", money(projection.line24));
  setText(form, "undefined_57", money(projection.line25Health));
  setText(form, "undefined_58", money(projection.line25Disability));
  setText(form, "1_2", money(projection.line25Hsa));
  setText(form, "undefined_59", money(projection.line25Total));
  setText(form, "undefined_61", money(projection.line26));
  setText(form, "undefined_62", money(projection.line27));
  setText(form, "undefined_63", money(projection.line28));
  setText(form, "undefined_64", money(projection.line29));
  setText(form, "undefined_65", money(projection.line30));
  setText(form, "undefined_66", money(projection.line31));
  setText(form, "undefined_67", money(projection.line32));
  setText(form, "undefined_71", money(projection.line33a));
  setText(form, "undefined_74", money(projection.line33b));
  setText(form, "undefined_77", money(projection.line33c));
  setText(form, "undefined_81", input.monthlyOtherSecuredDebt > 0 ? "Other secured debt" : "");
  setText(form, "secures the debt", input.monthlyOtherSecuredDebt > 0 ? "Other collateral" : "");
  setText(form, "undefined_82", money(projection.line33d * 60));
  setText(form, "undefined_83", money(projection.line33d));
  setText(form, "undefined_84", "");
  setText(form, "undefined_85", "");
  setText(form, "undefined_86", money(0));
  setText(form, "undefined_87", money(0));
  setText(form, "undefined_88", "");
  setText(form, "undefined_89", "");
  setText(form, "undefined_90", money(0));
  setText(form, "undefined_91", money(0));
  setText(form, "undefined_93", money(projection.line34));
  setText(form, "undefined_93-1", money(projection.line35Monthly));
  setText(form, "undefined_97", money(projection.line36));
  setText(form, "x", "1.00");
  setText(form, "undefined_100", money(projection.line37));
  setText(form, "undefined_101", money(projection.line24));
  setText(form, "undefined_102", money(projection.line32));
  setText(form, "undefined_103", money(projection.line37));
  setText(form, "undefined_110", money(projection.line38));
  setText(form, "undefined_113", money(projection.line41a));
  setText(form, "undefined_114", money(projection.line41b));
  setText(form, "undefined_115", "");
  setText(form, "undefined_116", money(0));
  setText(form, "undefined_117", "");
  setText(form, "undefined_118", money(0));
  setText(form, "undefined_119", "");
  setText(form, "undefined_120", money(0));
  maybeCheck(form, "CheckBox2", result.presumptionOfAbuse);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `b122a-2-draft-${input.filingDate || "undated"}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
