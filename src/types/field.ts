export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "phone"
  | "email"
  | "date"
  | "select"
  | "multi_select"
  | "file"
  | "url"
  | "currency"
  | "boolean";

export interface SelectOption {
  label: string;
  color?: string;
}

export interface FieldConfig {
  // select / multi_select
  options?: SelectOption[];

  // number / currency
  min?: number;
  max?: number;
  precision?: number;
  currency?: string;

  // file
  accept?: string[]; // ["image/*", "application/pdf", ".doc"]
  multiple?: boolean;
  max_size_mb?: number;

  // text / textarea
  max_length?: number;
  placeholder?: string;

  // date
  include_time?: boolean;

  // url
  open_in_new_tab?: boolean;
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  order: number;
  required: boolean;
  sensitive: boolean;
  filterable: boolean;
  searchable: boolean;
  show_in_table: boolean;
  config: FieldConfig;
  created_at: string;
  created_by: string;
}
