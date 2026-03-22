import type { HousingArtifact } from "../../src/datasets/types";
import type { HousingCountyModel } from "./housing-county-model";

function scaleHousehold(base: number): [number, number, number, number, number] {
  return [
    base,
    Math.round(base * 1.17),
    Math.round(base * 1.31),
    Math.round(base * 1.44),
    Math.round(base * 1.56),
  ];
}

/**
 * Conservative first-pass derivation:
 * group counties by repeated shared utility/mortgage pair within a state,
 * and emit a synthetic MSA-like override when at least 2 counties share that pair.
 *
 * This is intentionally conservative and should remain generation-time only until
 * the official housing-page structure is parsed more directly.
 */
export function deriveHousingMsaOverrides(model: HousingCountyModel): HousingArtifact["msa_overrides"] {
  const overrides: NonNullable<HousingArtifact["msa_overrides"]> = [];

  for (const [state, rows] of Object.entries(model.by_state)) {
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
      const counties = grouped.map((r) => r.county);

      overrides.push({
        name: `${state} grouped override ${utility}-${mortgage}`,
        counties: { [state]: counties },
        utility: scaleHousehold(utility),
        mortgage: scaleHousehold(mortgage),
      });
    }
  }

  return overrides;
}
