import { B122A2_TEMPLATE_BASE64 } from "./templates/b122a2_2025-04_official.base64";

export const B122A2_TEMPLATE = {
  revision: "Official Form 122A-2 04/25",
  source: "https://www.uscourts.gov/sites/default/files/2025-04/b_122a-2_0425-form.pdf",
  base64: B122A2_TEMPLATE_BASE64,
} as const;

export function decodeTemplateBase64(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
