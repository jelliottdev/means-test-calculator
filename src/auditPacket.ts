import type { MeansTestInput } from "./engine/meansTest";
import type { MeansTestResultV2 } from "./engine/v2/types";

export interface AuditPacketReview {
  reviewerName?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface MeansTestAuditPacket {
  schemaVersion: "1.0";
  exportedAt: string;
  caseSummary: {
    filingDate: string;
    state: string;
    county: string;
    householdSize: number;
    isJointFiling: boolean;
    debtType: MeansTestInput["debtType"];
  };
  review?: AuditPacketReview;
  reviewRequirements: string[];
  input: MeansTestInput;
  result: MeansTestResultV2;
}

export function buildAuditPacket(
  input: MeansTestInput,
  result: MeansTestResultV2,
  exportedAt = new Date().toISOString(),
  review?: AuditPacketReview,
): MeansTestAuditPacket {
  return {
    schemaVersion: "1.0",
    exportedAt,
    caseSummary: {
      filingDate: input.filingDate,
      state: input.state,
      county: input.county,
      householdSize: input.householdSize,
      isJointFiling: input.isJointFiling,
      debtType: input.debtType,
    },
    review,
    reviewRequirements: getReviewerSignoffReasons(result),
    input,
    result,
  };
}

export function downloadAuditPacket(packet: MeansTestAuditPacket): void {
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `means-test-audit-${packet.caseSummary.filingDate}-${packet.caseSummary.state || "unknown"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getReviewerSignoffReasons(result: MeansTestResultV2): string[] {
  const reasons: string[] = [];
  if (result.outcome === "FAIL") reasons.push("Presumption of abuse was triggered.");
  if (result.outcome === "BORDERLINE") reasons.push("Outcome is borderline and requires attorney review.");
  if (result.audit.warnings.length > 0) reasons.push("Audit warnings are present.");
  if (result.audit.assumptions.length > 0) reasons.push("Audit assumptions were used.");
  return reasons;
}

export function isReviewerSignoffRequired(result: MeansTestResultV2): boolean {
  return getReviewerSignoffReasons(result).length > 0;
}
