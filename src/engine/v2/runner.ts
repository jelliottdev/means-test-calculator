import { resolveDatasetsForFilingDate, type DatasetResolver } from "../../datasets/resolver";
import { runMeansTestFromBundle } from "./meansTestFromBundle";
import type { MeansTestInputV2, MeansTestResultV2 } from "./types";

export async function runMeansTestResolved(
  input: MeansTestInputV2,
  resolver?: DatasetResolver
): Promise<MeansTestResultV2> {
  const bundle = await resolveDatasetsForFilingDate(input.filingDate, resolver);
  return runMeansTestFromBundle(input, bundle);
}
