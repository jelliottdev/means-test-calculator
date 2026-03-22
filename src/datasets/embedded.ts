import manifest20251101 from "../../data/means-test/2025-11-01/manifest.json";
import manifest20260401 from "../../data/means-test/2026-04-01/manifest.json";
import housing20251101 from "../../data/means-test/2025-11-01/housing.json";
import medianIncome20251101 from "../../data/means-test/2025-11-01/median-income.json";
import nationalStandards20251101 from "../../data/means-test/2025-11-01/national-standards.json";
import thresholds20251101 from "../../data/means-test/2025-11-01/thresholds.json";
import transportation20260401 from "../../data/means-test/2026-04-01/transportation.json";
import type {
  HousingArtifact,
  MeansTestDatasetBundle,
  MedianIncomeArtifact,
  NationalStandardsArtifact,
  ThresholdsArtifact,
  TransportationArtifact,
} from "./types";

interface EmbeddedManifest {
  filing_date_resolution: {
    median_income: string;
    national_standards: string;
    transportation: string;
    housing: string;
    thresholds: string;
  };
}

const EMBEDDED_ARTIFACTS = {
  median_income: {
    "2025-11-01": medianIncome20251101 as unknown as MedianIncomeArtifact,
  } as Record<string, MedianIncomeArtifact>,
  national_standards: {
    "2025-11-01": nationalStandards20251101 as unknown as NationalStandardsArtifact,
  } as Record<string, NationalStandardsArtifact>,
  transportation: {
    "2026-04-01": transportation20260401 as unknown as TransportationArtifact,
  } as Record<string, TransportationArtifact>,
  housing: {
    "2025-11-01": housing20251101 as unknown as HousingArtifact,
  } as Record<string, HousingArtifact>,
  thresholds: {
    "2025-11-01": thresholds20251101 as unknown as ThresholdsArtifact,
  } as Record<string, ThresholdsArtifact>,
} as const;

const EMBEDDED_MANIFESTS: Record<string, EmbeddedManifest> = {
  "2025-11-01": manifest20251101 as EmbeddedManifest,
  "2026-04-01": manifest20260401 as EmbeddedManifest,
};

const MANIFEST_DATES = Object.keys(EMBEDDED_MANIFESTS).sort();

export const EMBEDDED_MIN_SUPPORTED_FILING_DATE =
  MANIFEST_DATES.find((filingDate) => isManifestSupportedForFilingDate(filingDate, EMBEDDED_MANIFESTS[filingDate]))
  ?? MANIFEST_DATES[MANIFEST_DATES.length - 1];

export interface EmbeddedDatasetSupport {
  supported: boolean;
  minimumFilingDate: string;
  reason?: string;
  resolvedManifestDate?: string;
}

function isManifestSupportedForFilingDate(filingDate: string, manifest: EmbeddedManifest): boolean {
  const resolution = manifest.filing_date_resolution;
  return Object.values(resolution).every((effectiveDate) => effectiveDate.localeCompare(filingDate) <= 0);
}

function getLatestManifestDateForFilingDate(filingDate: string): string | undefined {
  const eligibleDates = MANIFEST_DATES.filter((date) => date.localeCompare(filingDate) <= 0);
  return eligibleDates[eligibleDates.length - 1];
}

function getUnsupportedReason(filingDate: string, manifestDate: string): string | undefined {
  const manifest = EMBEDDED_MANIFESTS[manifestDate];
  const futureDatasets = Object.entries(manifest.filing_date_resolution)
    .filter(([, effectiveDate]) => effectiveDate.localeCompare(filingDate) > 0)
    .map(([dataset, effectiveDate]) => `${dataset} begins ${effectiveDate}`);

  if (futureDatasets.length === 0) return undefined;

  return `Embedded datasets cannot safely calculate a filing date of ${filingDate} because ${futureDatasets.join(", ")}. Earliest supported filing date is ${EMBEDDED_MIN_SUPPORTED_FILING_DATE}.`;
}

function getMedianIncomeArtifact(effectiveDate: string): MedianIncomeArtifact {
  const artifact = EMBEDDED_ARTIFACTS.median_income[effectiveDate];
  if (!artifact) throw new Error(`Embedded median_income artifact is missing for effective date ${effectiveDate}.`);
  return artifact;
}

function getNationalStandardsArtifact(effectiveDate: string): NationalStandardsArtifact {
  const artifact = EMBEDDED_ARTIFACTS.national_standards[effectiveDate];
  if (!artifact) throw new Error(`Embedded national_standards artifact is missing for effective date ${effectiveDate}.`);
  return artifact;
}

function getTransportationArtifact(effectiveDate: string): TransportationArtifact {
  const artifact = EMBEDDED_ARTIFACTS.transportation[effectiveDate];
  if (!artifact) throw new Error(`Embedded transportation artifact is missing for effective date ${effectiveDate}.`);
  return artifact;
}

function getHousingArtifact(effectiveDate: string): HousingArtifact {
  const artifact = EMBEDDED_ARTIFACTS.housing[effectiveDate];
  if (!artifact) throw new Error(`Embedded housing artifact is missing for effective date ${effectiveDate}.`);
  return artifact;
}

function getThresholdsArtifact(effectiveDate: string): ThresholdsArtifact {
  const artifact = EMBEDDED_ARTIFACTS.thresholds[effectiveDate];
  if (!artifact) throw new Error(`Embedded thresholds artifact is missing for effective date ${effectiveDate}.`);
  return artifact;
}

export function getEmbeddedDatasetSupport(filingDate: string): EmbeddedDatasetSupport {
  const manifestDate = getLatestManifestDateForFilingDate(filingDate);
  if (!manifestDate) {
    return {
      supported: false,
      minimumFilingDate: EMBEDDED_MIN_SUPPORTED_FILING_DATE,
      reason: `Embedded datasets begin ${MANIFEST_DATES[0]}, so filing dates before ${MANIFEST_DATES[0]} are unsupported in this build. Earliest fully supported filing date is ${EMBEDDED_MIN_SUPPORTED_FILING_DATE}.`,
    };
  }

  const reason = getUnsupportedReason(filingDate, manifestDate);
  if (reason) {
    return {
      supported: false,
      minimumFilingDate: EMBEDDED_MIN_SUPPORTED_FILING_DATE,
      reason,
      resolvedManifestDate: manifestDate,
    };
  }

  return {
    supported: true,
    minimumFilingDate: EMBEDDED_MIN_SUPPORTED_FILING_DATE,
    resolvedManifestDate: manifestDate,
  };
}

export function getEmbeddedDatasetBundle(filingDate: string): MeansTestDatasetBundle {
  const support = getEmbeddedDatasetSupport(filingDate);
  if (!support.supported || !support.resolvedManifestDate) {
    throw new Error(support.reason ?? `Embedded datasets do not support filing date ${filingDate}.`);
  }

  const resolution = EMBEDDED_MANIFESTS[support.resolvedManifestDate].filing_date_resolution;

  return {
    filing_date: filingDate,
    median_income: getMedianIncomeArtifact(resolution.median_income),
    national_standards: getNationalStandardsArtifact(resolution.national_standards),
    transportation: getTransportationArtifact(resolution.transportation),
    housing: getHousingArtifact(resolution.housing),
    thresholds: getThresholdsArtifact(resolution.thresholds),
  };
}
