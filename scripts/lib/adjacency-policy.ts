export interface AdjacencyPolicy {
  max_forward_rows: number;
  stop_on_header: boolean;
  stop_on_region_header: boolean;
}

export const DEFAULT_ADJACENCY_POLICY: AdjacencyPolicy = {
  max_forward_rows: 6,
  stop_on_header: true,
  stop_on_region_header: true,
};

export const WIDE_ADJACENCY_POLICY: AdjacencyPolicy = {
  max_forward_rows: 10,
  stop_on_header: true,
  stop_on_region_header: true,
};
