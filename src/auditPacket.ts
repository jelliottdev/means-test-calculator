import type { MeansTestInput } from "./engine/meansTest";
import type { MeansTestResultV2 } from "./engine/v2/types";

export interface AuditPacketReview {
  reviewerName?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
}

export interface AuditPacketReviewStatus {
  signoffRequired: boolean;
  reasons: string[];
  readyForExport: boolean;
  blockers: string[];
  completedBy?: string;
  completedAt?: string;
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
  reviewStatus: AuditPacketReviewStatus;
  input: MeansTestInput;
  result: MeansTestResultV2;
}

export function buildAuditPacket(
  input: MeansTestInput,
  result: MeansTestResultV2,
  exportedAt = new Date().toISOString(),
  review?: AuditPacketReview,
): MeansTestAuditPacket {
  const normalizedReview = normalizeAuditReview(review);

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
    review: normalizedReview,
    reviewRequirements: getReviewerSignoffReasons(result),
    reviewStatus: getAuditReviewStatus(result, normalizedReview),
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

export function normalizeAuditReview(review?: AuditPacketReview): AuditPacketReview | undefined {
  if (!review) return undefined;

  const reviewerName = review.reviewerName?.trim() || undefined;
  const reviewerNotes = review.reviewerNotes?.trim() || undefined;
  const reviewedAt = review.reviewedAt?.trim() || undefined;

  if (!reviewerName && !reviewerNotes && !reviewedAt) return undefined;

  return { reviewerName, reviewerNotes, reviewedAt };
}

export function getAuditReviewStatus(result: MeansTestResultV2, review?: AuditPacketReview): AuditPacketReviewStatus {
  const reasons = getReviewerSignoffReasons(result);
  const normalizedReview = normalizeAuditReview(review);
  const blockers: string[] = [];
  const signoffRequired = reasons.length > 0;

  if (signoffRequired && !normalizedReview?.reviewerName) blockers.push("Reviewer name is missing.");
  if (signoffRequired && !normalizedReview?.reviewerNotes) blockers.push("Reviewer notes are missing.");

  return {
    signoffRequired,
    reasons,
    readyForExport: blockers.length === 0,
    blockers,
    completedBy: normalizedReview?.reviewerName,
    completedAt: normalizedReview?.reviewedAt,
  };
}
