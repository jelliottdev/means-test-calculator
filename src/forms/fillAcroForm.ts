import { TextAlignment, type PDFCheckBox, type PDFForm, type PDFTextField } from "pdf-lib";
import type { FillValue, TextFieldMapping, CheckboxFieldMapping } from "./b122a2FieldMap";

function formatFillValue(value: FillValue): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "0";
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
}

function getFieldNames(form: PDFForm): Set<string> {
  return new Set(form.getFields().map((field) => field.getName()));
}

function assertFieldExists(fieldNames: Set<string>, fieldName: string, key: string): void {
  if (!fieldNames.has(fieldName)) {
    throw new Error(`B122A-2 template mismatch: required field '${fieldName}' (${key}) is missing.`);
  }
}

export function fillAcroFormText(
  form: PDFForm,
  fieldMappings: readonly TextFieldMapping[],
  resolveValue: (mapping: TextFieldMapping) => FillValue,
): void {
  const fieldNames = getFieldNames(form);
  for (const mapping of fieldMappings) {
    if (mapping.required) {
      assertFieldExists(fieldNames, mapping.pdfFieldName, mapping.key);
    }
    const field = form.getTextField(mapping.pdfFieldName) as PDFTextField;
    field.setAlignment(TextAlignment.Left);
    field.setText(formatFillValue(resolveValue(mapping)));
    field.enableReadOnly();
  }
}

export function fillAcroFormCheckboxes(
  form: PDFForm,
  fieldMappings: readonly CheckboxFieldMapping[],
  presumptionOfAbuse: boolean,
): void {
  const fieldNames = getFieldNames(form);
  for (const mapping of fieldMappings) {
    if (mapping.required) {
      assertFieldExists(fieldNames, mapping.pdfFieldName, mapping.key);
    }
    const field = form.getCheckBox(mapping.pdfFieldName) as PDFCheckBox;
    if (mapping.value(presumptionOfAbuse)) {
      field.check();
    } else {
      field.uncheck();
    }
    field.enableReadOnly();
  }
}
