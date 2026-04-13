export type { PermissionKey } from "@/lib/permissions";

// ── API Response Types ──────────────────────────────

export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: { code: string; message: string };
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ── Database Inferred Types ──────────────────────────

export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ── Filter Types ──────────────────────────────────────

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "is_empty"
  | "is_not_empty"
  | "in"
  | "not_in";

export type Filter = {
  fieldId: string;
  operator: FilterOperator;
  value: unknown;
};

export type FilterGroup = {
  match: "all" | "any";
  filters: Filter[];
};

export type SortConfig = {
  fieldId: string;
  direction: "asc" | "desc";
};

// ── Field Config Types ──────────────────────────────

export type SelectOption = {
  label: string;
  value: string;
  color?: string;
};

export type FieldConfig = {
  placeholder?: string;
  options?: SelectOption[];
  currency?: string;
  min?: number;
  max?: number;
  allowedTypes?: string[];
  maxSize?: number;
};
