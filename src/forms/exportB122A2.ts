import { PDFDocument } from "pdf-lib";
import type { MeansTestInput } from "../engine/meansTest";
import type { MeansTestResultV2 } from "../engine/v2/types";
import { B122A2_CHECKBOX_MAP, B122A2_TEXT_FIELD_MAP } from "./b122a2FieldMap";
import { projectB122A2Values, type AboveMedianResult } from "./b122a2Projection";
import { B122A2_TEMPLATE, decodeTemplateBase64 } from "./b122a2Template";
import { fillAcroFormCheckboxes, fillAcroFormText } from "./fillAcroForm";

function assertAboveMedianOutcome(result: MeansTestResultV2): asserts result is AboveMedianResult {
  if (result.outcome === "EXEMPT" || result.outcome === "BELOW_MEDIAN") {
    throw new Error("Form 122A-2 export is only available for above-median calculations.");
  }
}


export async function exportB122A2Draft(input: MeansTestInput, result: MeansTestResultV2): Promise<void> {
  assertAboveMedianOutcome(result);

  const projection = projectB122A2Values(input, result);
  const pdfDoc = await PDFDocument.load(decodeTemplateBase64(B122A2_TEMPLATE.base64));
  const form = pdfDoc.getForm();

  fillAcroFormText(form, B122A2_TEXT_FIELD_MAP, (mapping) => mapping.value(projection));
  fillAcroFormCheckboxes(form, B122A2_CHECKBOX_MAP, result.presumptionOfAbuse);

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
