import { getEmbeddedDatasetBundle } from "../../datasets/embedded";
import { runMeansTestFromBundle } from "./meansTestFromBundle";
import type { MeansTestInputV2, MeansTestResultV2 } from "./types";

export function runMeansTestV2(input: MeansTestInputV2): MeansTestResultV2 {
  return runMeansTestFromBundle(input, getEmbeddedDatasetBundle(input.filingDate));
}
