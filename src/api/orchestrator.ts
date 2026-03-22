import type { DatasetResolver } from "../datasets/resolver";
import { resolveDatasetsForFilingDate } from "../datasets/resolver";
import { getBundleProvenance } from "../datasets/provenance";
import { validateDatasetBundle } from "../../scripts/lib/validate-artifacts";
import { validateHousingCoverage, validateTransportationCoverage } from "../../scripts/lib/validate-geography-coverage";
import { validatePublicationReadiness } from "../../scripts/lib/validate-publication";
import { runMeansTestForAgent, runLegacyMeansTestForAgent } from "./runtime";
import type { MeansTestInput } from "../engine/meansTest";
import type { MeansTestInputV2 } from "../engine/v2";

export interface FilingDateBundleStatus {
  filing_date: string;
  publication_ready: boolean;
  bundle_validation: ReturnType<typeof validateDatasetBundle>;
  transport_coverage: ReturnType<typeof validateTransportationCoverage>;
  housing_coverage: ReturnType<typeof validateHousingCoverage>;
  publication: ReturnType<typeof validatePublicationReadiness>;
  provenance: ReturnType<typeof getBundleProvenance>;
}

export async function getBundleStatus(
  filingDate: string,
  resolver?: DatasetResolver,
): Promise<FilingDateBundleStatus> {
  const bundle = await resolveDatasetsForFilingDate(filingDate, resolver);
  const bundleValidation = validateDatasetBundle(bundle);
  const transportCoverage = validateTransportationCoverage(bundle.transportation);
  const housingCoverage = validateHousingCoverage(bundle.housing);
  const publication = validatePublicationReadiness(bundle);
  const provenance = getBundleProvenance(bundle);

  return {
    filing_date: filingDate,
    publication_ready: publication.ready,
    bundle_validation: bundleValidation,
    transport_coverage: transportCoverage,
    housing_coverage: housingCoverage,
    publication,
    provenance,
  };
}

export async function runBundleCheckedMeansTest(
  input: MeansTestInputV2,
  resolver?: DatasetResolver,
) {
  return runMeansTestForAgent(input, resolver);
}

export async function runBundleCheckedLegacyMeansTest(
  input: MeansTestInput,
  resolver?: DatasetResolver,
) {
  return runLegacyMeansTestForAgent(input, resolver);
}
