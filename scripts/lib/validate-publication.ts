import type { MeansTestDatasetBundle } from "../../src/datasets/types";
import { validateDatasetBundle } from "./validate-artifacts";
import { validateHousingCoverage, validateTransportationCoverage } from "./validate-geography-coverage";

export interface PublicationReadiness {
  ready: boolean;
  hard_failures: string[];
  soft_warnings: string[];
}

function hasSourceMeta(bundle: MeansTestDatasetBundle): string[] {
  const failures: string[] = [];
  const datasets = [
    bundle.median_income,
    bundle.national_standards,
    bundle.transportation,
    bundle.housing,
    bundle.thresholds,
  ];

  for (const ds of datasets) {
    if (!ds.source_url) failures.push(`${ds.kind} missing source_url`);
    if (!ds.effective_date) failures.push(`${ds.kind} missing effective_date`);
  }

  return failures;
}

export function validatePublicationReadiness(bundle: MeansTestDatasetBundle): PublicationReadiness {
  const hard_failures: string[] = [];
  const soft_warnings: string[] = [];

  const base = validateDatasetBundle(bundle);
  const transport = validateTransportationCoverage(bundle.transportation);
  const housing = validateHousingCoverage(bundle.housing);
  const meta = hasSourceMeta(bundle);

  hard_failures.push(...base.errors, ...transport.errors, ...housing.errors, ...meta);
  soft_warnings.push(...base.warnings, ...transport.warnings, ...housing.warnings);

  if (!bundle.median_income.source_hash) soft_warnings.push("median income missing source_hash");
  if (!bundle.national_standards.source_hash) soft_warnings.push("national standards missing source_hash");
  if (!bundle.transportation.source_hash) soft_warnings.push("transportation missing source_hash");
  if (!bundle.thresholds.source_hash) soft_warnings.push("thresholds missing source_hash");

  if ((bundle.housing.msa_overrides?.length ?? 0) === 0) {
    soft_warnings.push("housing publication has no MSA overrides");
  }
  if (Object.keys(bundle.transportation.regions).length < 4) {
    soft_warnings.push("transportation publication has incomplete region coverage");
  }

  return {
    ready: hard_failures.length === 0,
    hard_failures,
    soft_warnings,
  };
}
