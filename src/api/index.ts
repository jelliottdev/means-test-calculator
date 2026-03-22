export { runMeansTest } from "../engine/meansTest";
export type { MeansTestInput, MeansTestResult, LineItem } from "../engine/meansTest";

export {
  runMeansTestV2,
  normalizeLegacyInput,
} from "../engine/v2";

export type {
  MeansTestInputV2,
  MeansTestResultV2,
  CalculationAudit,
  LineItemV2,
  VehicleInput,
  IncomeSourceV2,
  DatasetVersionMeta,
  DataSourceKind,
} from "../engine/v2";
