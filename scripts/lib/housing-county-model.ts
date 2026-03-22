export interface HousingCountyRecord {
  state: string;
  county: string;
  utility: number;
  mortgage: number;
  source_page: string;
  source_hash?: string;
}

export interface HousingCountyModel {
  by_state: Record<string, HousingCountyRecord[]>;
}

export function createHousingCountyModel(): HousingCountyModel {
  return { by_state: {} };
}

export function addHousingCountyRecord(model: HousingCountyModel, record: HousingCountyRecord): void {
  if (!model.by_state[record.state]) model.by_state[record.state] = [];
  model.by_state[record.state].push(record);
}

export function countHousingCounties(model: HousingCountyModel, state?: string): number {
  if (state) return model.by_state[state]?.length ?? 0;
  return Object.values(model.by_state).reduce((sum, rows) => sum + rows.length, 0);
}

export function toHousingCountyOverrides(model: HousingCountyModel) {
  const scale = (base: number): [number, number, number, number, number] => [
    base,
    Math.round(base * 1.17),
    Math.round(base * 1.31),
    Math.round(base * 1.44),
    Math.round(base * 1.56),
  ];

  return Object.entries(model.by_state)
    .flatMap(([state, rows]) => rows.map((row) => ({
      state,
      county: row.county,
      utility: scale(row.utility),
      mortgage: scale(row.mortgage),
    })))
    .sort((left, right) => (left.state === right.state ? left.county.localeCompare(right.county) : left.state.localeCompare(right.state)));
}
