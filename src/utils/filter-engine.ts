import type { Filter, FilterGroup, FilterOperator } from "@/types/filter";
import type { Field } from "@/types/field";
import type { CrmRecord } from "@/types/record";
import {
  isToday,
  isThisWeek,
  isThisMonth,
  isAfter,
  isBefore,
  subDays,
  parseISO,
} from "date-fns";

function getRecordValue(record: CrmRecord, fieldId: string): unknown {
  return record.data[fieldId];
}

function evaluateFilter(
  record: CrmRecord,
  filter: Filter,
  fields: Field[]
): boolean {
  const value = getRecordValue(record, filter.field_id);
  const field = fields.find((f) => f.id === filter.field_id);
  if (!field) return true;

  return evaluateOperator(value, filter.operator, filter.value, field.type);
}

function evaluateOperator(
  value: unknown,
  operator: FilterOperator,
  filterValue: unknown,
  fieldType: string
): boolean {
  // Empty checks (work for all types)
  if (operator === "is_empty") {
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }
  if (operator === "is_not_empty") {
    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0)
    );
  }

  // Boolean
  if (operator === "is_true") return value === true;
  if (operator === "is_false") return value === false || !value;

  // File operators
  if (operator === "has_file") {
    return Array.isArray(value) ? value.length > 0 : !!value;
  }
  if (operator === "has_no_file") {
    return Array.isArray(value) ? value.length === 0 : !value;
  }
  if (operator === "file_count_gt") {
    return Array.isArray(value) ? value.length > Number(filterValue) : false;
  }
  if (operator === "file_count_lt") {
    return Array.isArray(value) ? value.length < Number(filterValue) : true;
  }

  // Text operators
  const strVal = String(value ?? "").toLowerCase();
  const strFilter = String(filterValue ?? "").toLowerCase();

  if (operator === "is") return strVal === strFilter;
  if (operator === "is_not") return strVal !== strFilter;
  if (operator === "contains") return strVal.includes(strFilter);
  if (operator === "not_contains") return !strVal.includes(strFilter);
  if (operator === "starts_with") return strVal.startsWith(strFilter);
  if (operator === "ends_with") return strVal.endsWith(strFilter);

  // Number / Currency operators
  const numVal = Number(value);
  const numFilter = Number(filterValue);

  if (operator === "eq") return numVal === numFilter;
  if (operator === "neq") return numVal !== numFilter;
  if (operator === "gt") return numVal > numFilter;
  if (operator === "gte") return numVal >= numFilter;
  if (operator === "lt") return numVal < numFilter;
  if (operator === "lte") return numVal <= numFilter;
  if (operator === "between" && Array.isArray(filterValue)) {
    return numVal >= Number(filterValue[0]) && numVal <= Number(filterValue[1]);
  }

  // Select operators
  if (operator === "is_any_of" && Array.isArray(filterValue)) {
    return filterValue.map((v) => String(v).toLowerCase()).includes(strVal);
  }
  if (operator === "is_none_of" && Array.isArray(filterValue)) {
    return !filterValue.map((v) => String(v).toLowerCase()).includes(strVal);
  }

  // Multi-select operators
  if (operator === "contains_any" && Array.isArray(filterValue) && Array.isArray(value)) {
    return filterValue.some((fv) => value.includes(fv));
  }
  if (operator === "contains_all" && Array.isArray(filterValue) && Array.isArray(value)) {
    return filterValue.every((fv) => value.includes(fv));
  }

  // Date operators
  if (fieldType === "date" && typeof value === "string") {
    const dateVal = parseISO(value);

    if (operator === "is_before" && typeof filterValue === "string")
      return isBefore(dateVal, parseISO(filterValue));
    if (operator === "is_after" && typeof filterValue === "string")
      return isAfter(dateVal, parseISO(filterValue));
    if (operator === "is_between" && Array.isArray(filterValue))
      return (
        isAfter(dateVal, parseISO(filterValue[0])) &&
        isBefore(dateVal, parseISO(filterValue[1]))
      );
    if (operator === "is_today") return isToday(dateVal);
    if (operator === "is_this_week") return isThisWeek(dateVal);
    if (operator === "is_this_month") return isThisMonth(dateVal);
    if (operator === "is_last_7_days")
      return isAfter(dateVal, subDays(new Date(), 7));
    if (operator === "is_last_30_days")
      return isAfter(dateVal, subDays(new Date(), 30));
  }

  return true;
}

export function applyFilters(
  records: CrmRecord[],
  filterGroup: FilterGroup,
  fields: Field[]
): CrmRecord[] {
  if (filterGroup.filters.length === 0) return records;

  return records.filter((record) => {
    const results = filterGroup.filters.map((filter) =>
      evaluateFilter(record, filter, fields)
    );

    if (filterGroup.match === "all") {
      return results.every(Boolean);
    }
    return results.some(Boolean);
  });
}

export function getOperatorsForFieldType(fieldType: string): FilterOperator[] {
  switch (fieldType) {
    case "text":
    case "textarea":
      return [
        "is", "is_not", "contains", "not_contains",
        "starts_with", "ends_with", "is_empty", "is_not_empty",
      ];
    case "number":
    case "currency":
      return ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_empty", "is_not_empty"];
    case "select":
      return ["is", "is_not", "is_any_of", "is_none_of", "is_empty", "is_not_empty"];
    case "multi_select":
      return ["contains", "not_contains", "contains_any", "contains_all", "is_empty", "is_not_empty"];
    case "date":
      return [
        "is", "is_before", "is_after", "is_between",
        "is_today", "is_this_week", "is_this_month",
        "is_last_7_days", "is_last_30_days", "is_empty", "is_not_empty",
      ];
    case "file":
      return ["has_file", "has_no_file", "file_count_gt", "file_count_lt"];
    case "boolean":
      return ["is_true", "is_false"];
    case "phone":
    case "email":
    case "url":
      return ["is", "contains", "starts_with", "is_empty", "is_not_empty"];
    default:
      return ["is", "is_not", "is_empty", "is_not_empty"];
  }
}

export function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<string, string> = {
    is: "is",
    is_not: "is not",
    contains: "contains",
    not_contains: "does not contain",
    starts_with: "starts with",
    ends_with: "ends with",
    is_empty: "is empty",
    is_not_empty: "is not empty",
    eq: "equals",
    neq: "not equals",
    gt: "greater than",
    gte: "greater or equal",
    lt: "less than",
    lte: "less or equal",
    between: "between",
    is_any_of: "is any of",
    is_none_of: "is none of",
    contains_any: "contains any of",
    contains_all: "contains all of",
    is_before: "is before",
    is_after: "is after",
    is_between: "is between",
    is_today: "is today",
    is_this_week: "is this week",
    is_this_month: "is this month",
    is_last_7_days: "last 7 days",
    is_last_30_days: "last 30 days",
    has_file: "has file",
    has_no_file: "has no file",
    file_count_gt: "file count greater than",
    file_count_lt: "file count less than",
    file_type_is: "file type is",
    is_true: "is yes",
    is_false: "is no",
  };
  return labels[operator] || operator;
}
