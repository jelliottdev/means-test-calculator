import type { DatasetResolver } from "../datasets/resolver";
import { resolveDatasetsForFilingDate } from "../datasets/resolver";
import { getBundleProvenance } from "../datasets/provenance";
import { validatePublicationReadiness } from "../../scripts/lib/validate-publication";

export interface AgentPreflightResult {
  filing_date: string;
  publication_ready: boolean;
  hard_failures: string[];
  soft_warnings: string[];
  provenance: ReturnType<typeof getBundleProvenance>;
}

export async function runAgentPreflight(
  filingDate: string,
  resolver?: DatasetResolver,
): Promise<AgentPreflightResult> {
  const bundle = await resolveDatasetsForFilingDate(filingDate, resolver);
  const readiness = validatePublicationReadiness(bundle);
  const provenance = getBundleProvenance(bundle);

  return {
    filing_date: filingDate,
    publication_ready: readiness.ready,
    hard_failures: readiness.hard_failures,
    soft_warnings: readiness.soft_warnings,
    provenance,
  };
}
