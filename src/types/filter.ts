export type FilterOperator =
  // Text
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  // Number / Currency
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  // Select
  | "is_any_of"
  | "is_none_of"
  // Multi-select
  | "contains_any"
  | "contains_all"
  // Date
  | "is_before"
  | "is_after"
  | "is_between"
  | "is_today"
  | "is_this_week"
  | "is_this_month"
  | "is_last_7_days"
  | "is_last_30_days"
  // File
  | "has_file"
  | "has_no_file"
  | "file_count_gt"
  | "file_count_lt"
  | "file_type_is"
  // Boolean
  | "is_true"
  | "is_false";

export interface Filter {
  id: string;
  field_id: string;
  operator: FilterOperator;
  value: unknown;
}

export interface FilterGroup {
  match: "all" | "any"; // AND / OR
  filters: Filter[];
}

export interface SortConfig {
  field_id: string;
  direction: "asc" | "desc";
}

export interface SavedView {
  id: string;
  name: string;
  filters: FilterGroup;
  sort: SortConfig[];
  columns: { field_id: string; width?: number }[];
  created_by: string;
  shared: boolean;
  pinned: boolean;
  created_at: string;
}
