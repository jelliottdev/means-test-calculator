export interface AdjacencyPolicyV3 {
  max_forward_rows: number;
  stop_on_header: boolean;
  stop_on_region_header: boolean;
  stop_on_implicit_header: boolean;
}

export const STRICT_ADJACENCY_POLICY_V3: AdjacencyPolicyV3 = {
  max_forward_rows: 5,
  stop_on_header: true,
  stop_on_region_header: true,
  stop_on_implicit_header: true,
};

export const BALANCED_ADJACENCY_POLICY_V3: AdjacencyPolicyV3 = {
  max_forward_rows: 9,
  stop_on_header: true,
  stop_on_region_header: true,
  stop_on_implicit_header: true,
};

export const PERMISSIVE_ADJACENCY_POLICY_V3: AdjacencyPolicyV3 = {
  max_forward_rows: 14,
  stop_on_header: true,
  stop_on_region_header: true,
  stop_on_implicit_header: false,
};
