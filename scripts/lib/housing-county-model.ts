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
