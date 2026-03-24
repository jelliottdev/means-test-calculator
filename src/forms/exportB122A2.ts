import { PDFDocument } from "pdf-lib";
import type { MeansTestInput } from "../engine/meansTest";
import type { MeansTestResultV2 } from "../engine/v2/types";
import { B122A2_CHECKBOX_MAP, B122A2_TEXT_FIELD_MAP } from "./b122a2FieldMap";
import { projectB122A2Values, type AboveMedianResult } from "./b122a2Projection";
import { B122A2_TEMPLATE, decodeTemplateBase64 } from "./b122a2Template";
import { fillAcroFormCheckboxes, fillAcroFormText } from "./fillAcroForm";
import type { B122A2DraftSupplement } from "./b122a2DraftSupplement";

function assertAboveMedianOutcome(result: MeansTestResultV2): asserts result is AboveMedianResult {
  if (result.outcome === "EXEMPT" || result.outcome === "BELOW_MEDIAN") {
    throw new Error("Form 122A-2 export is only available for above-median calculations.");
  }
}


function fillOptionalText(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, value?: string): void {
  if (!value) return;
  const names = new Set(form.getFields().map((field) => field.getName()));
  if (!names.has(fieldName)) {
    throw new Error(`B122A-2 template mismatch: optional field ${fieldName} is not available.`);
  }
  const field = form.getTextField(fieldName);
  field.setText(value);
  field.enableReadOnly();
}

function fillOptionalCheckbox(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, checked: boolean | undefined): void {
  if (checked === undefined) return;
  const names = new Set(form.getFields().map((field) => field.getName()));
  if (!names.has(fieldName)) {
    throw new Error(`B122A-2 template mismatch: optional field ${fieldName} is not available.`);
  }
  const field = form.getCheckBox(fieldName);
  if (checked) {
    field.check();
  } else {
    field.uncheck();
  }
  field.enableReadOnly();
}

function fillOptionalDropdown(form: ReturnType<PDFDocument["getForm"]>, fieldName: string, value?: string): void {
  if (!value) return;
  const names = new Set(form.getFields().map((field) => field.getName()));
  if (!names.has(fieldName)) {
    throw new Error(`B122A-2 template mismatch: optional field ${fieldName} is not available.`);
  }
  const field = form.getDropdown(fieldName);
  field.select(value);
  field.enableReadOnly();
}

export async function exportB122A2Draft(input: MeansTestInput, result: MeansTestResultV2, supplement?: B122A2DraftSupplement): Promise<void> {
  assertAboveMedianOutcome(result);

  const projection = projectB122A2Values(input, result);
  const pdfDoc = await PDFDocument.load(decodeTemplateBase64(B122A2_TEMPLATE.base64));
  const form = pdfDoc.getForm();

  fillAcroFormText(form, B122A2_TEXT_FIELD_MAP, (mapping) => mapping.value(projection));
  fillAcroFormCheckboxes(form, B122A2_CHECKBOX_MAP, result.presumptionOfAbuse);

  fillOptionalText(form, "Debtor1.Name", supplement?.debtor1Name);
  fillOptionalText(form, "Debtor2.Name", supplement?.debtor2Name);
  fillOptionalDropdown(form, "Bankruptcy District Information", supplement?.bankruptcyDistrict);
  fillOptionalText(form, "Case number1", supplement?.caseNumber);
  fillOptionalCheckbox(form, "CheckBox3", supplement?.amendedFiling);

  fillOptionalText(form, "Quest9B creditor name1", supplement?.mortgageCreditor1);
  fillOptionalText(form, "Quest13B Creditor for vehicle 1-1", supplement?.vehicle1Creditor1);
  fillOptionalText(form, "Quest13E.Creditor1", supplement?.vehicle2Creditor1);
  fillOptionalText(form, "undefined_81", supplement?.otherSecuredDebtCreditor);
  fillOptionalText(form, "secures the debt", supplement?.otherSecuredDebtCollateral);

  const pdfBytes = await pdfDoc.save();
  const normalizedBytes = new Uint8Array(Array.from(pdfBytes));
  const blob = new Blob([normalizedBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `b122a-2-draft-${input.filingDate || "undated"}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
