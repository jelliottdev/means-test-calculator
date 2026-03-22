import type { HousingArtifact } from "../../src/datasets/types";
import type { HousingCountyModel } from "./housing-county-model";
import { dedupeCounties } from "./geography";

/**
 * Direct-ish housing override derivation.
 *
 * This remains conservative: it only emits an override when multiple counties in the
 * same state share the same utility/mortgage pair and the grouping is distinct from
 * the statewide average. It is intended as a better bridge toward direct official
 * MSA extraction than the earlier generic grouped override helper.
 */
export function deriveHousingMsaOverridesDirect(
  model: HousingCountyModel,
  stateDefaults: HousingArtifact["state_defaults"],
): NonNullable<HousingArtifact["msa_overrides"]> {
  const overrides: NonNullable<HousingArtifact["msa_overrides"]> = [];

  for (const [state, rows] of Object.entries(model.by_state)) {
    const std = stateDefaults[state];
    const statewideUtility = std?.utility?.[0] ?? 0;
    const statewideMortgage = std?.mortgage?.[0] ?? 0;
    const groups = new Map<string, typeof rows>();

    for (const row of rows) {
      const key = `${row.utility}::${row.mortgage}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    for (const [key, grouped] of groups.entries()) {
      if (grouped.length < 2) continue;
      const [utilityStr, mortgageStr] = key.split("::");
      const utility = parseInt(utilityStr, 10);
      const mortgage = parseInt(mortgageStr, 10);

      if (utility === statewideUtility && mortgage === statewideMortgage) continue;

      const counties = dedupeCounties(grouped.map((r) => r.county));
      if (counties.length < 2) continue;

      const scale = (base: number): [number, number, number, number, number] => [
        base,
        Math.round(base * 1.17),
        Math.round(base * 1.31),
        Math.round(base * 1.44),
        Math.round(base * 1.56),
      ];

      overrides.push({
        name: `${state} direct-like override ${counties.slice(0, 3).join(", ")}`,
        counties: { [state]: counties },
        utility: scale(utility),
        mortgage: scale(mortgage),
      });
    }
  }

  return overrides;
}
