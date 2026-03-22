import { getEmbeddedDatasetBundle } from "./embedded";
import type { MeansTestDatasetBundle } from "./types";

export interface DatasetResolver {
  resolve(filingDate: string): Promise<MeansTestDatasetBundle> | MeansTestDatasetBundle;
}

export class EmbeddedDatasetResolver implements DatasetResolver {
  resolve(filingDate: string): MeansTestDatasetBundle {
    return getEmbeddedDatasetBundle(filingDate);
  }
}

export async function resolveDatasetsForFilingDate(
  filingDate: string,
  resolver: DatasetResolver = new EmbeddedDatasetResolver()
): Promise<MeansTestDatasetBundle> {
  return await resolver.resolve(filingDate);
}
