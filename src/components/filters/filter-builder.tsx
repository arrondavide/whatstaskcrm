"use client";

import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTenantStore } from "@/stores/tenant-store";
import { useRecordStore } from "@/stores/record-store";
import { getOperatorsForFieldType, getOperatorLabel } from "@/utils/filter-engine";
import type { Filter, FilterGroup } from "@/types/filter";
import { v4 as uuid } from "uuid";

export function FilterBuilder() {
  const { fields } = useTenantStore();
  const { activeFilters, setActiveFilters } = useRecordStore();
  const [showSaveView, setShowSaveView] = useState(false);

  const filterableFields = fields.filter((f) => f.filterable);

  function addFilter() {
    if (filterableFields.length === 0) return;
    const firstField = filterableFields[0];
    const operators = getOperatorsForFieldType(firstField.type);

    const newFilter: Filter = {
      id: uuid(),
      field_id: firstField.id,
      operator: operators[0],
      value: "",
    };

    setActiveFilters({
      ...activeFilters,
      filters: [...activeFilters.filters, newFilter],
    });
  }

  function updateFilter(id: string, updates: Partial<Filter>) {
    setActiveFilters({
      ...activeFilters,
      filters: activeFilters.filters.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    });
  }

  function removeFilter(id: string) {
    setActiveFilters({
      ...activeFilters,
      filters: activeFilters.filters.filter((f) => f.id !== id),
    });
  }

  function clearAll() {
    setActiveFilters({ match: "all", filters: [] });
  }

  function toggleMatch() {
    setActiveFilters({
      ...activeFilters,
      match: activeFilters.match === "all" ? "any" : "all",
    });
  }

  if (activeFilters.filters.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={addFilter}>
        <Plus className="mr-1 h-4 w-4" />
        Add Filter
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filters</span>
          <button
            onClick={toggleMatch}
            className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Match {activeFilters.match === "all" ? "ALL" : "ANY"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
          <Button variant="ghost" size="sm" onClick={addFilter}>
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      </div>

      {/* Filter rows */}
      {activeFilters.filters.map((filter) => {
        const field = filterableFields.find((f) => f.id === filter.field_id);
        const operators = field
          ? getOperatorsForFieldType(field.type)
          : [];

        return (
          <div key={filter.id} className="flex items-center gap-2">
            {/* Field select */}
            <Select
              value={filter.field_id}
              onChange={(e) => {
                const newField = filterableFields.find(
                  (f) => f.id === e.target.value
                );
                const newOps = newField
                  ? getOperatorsForFieldType(newField.type)
                  : [];
                updateFilter(filter.id, {
                  field_id: e.target.value,
                  operator: newOps[0],
                  value: "",
                });
              }}
              options={filterableFields.map((f) => ({
                value: f.id,
                label: f.label,
              }))}
              className="w-40"
            />

            {/* Operator select */}
            <Select
              value={filter.operator}
              onChange={(e) =>
                updateFilter(filter.id, { operator: e.target.value as Filter["operator"] })
              }
              options={operators.map((op) => ({
                value: op,
                label: getOperatorLabel(op),
              }))}
              className="w-40"
            />

            {/* Value input */}
            {!["is_empty", "is_not_empty", "has_file", "has_no_file", "is_true", "is_false", "is_today", "is_this_week", "is_this_month", "is_last_7_days", "is_last_30_days"].includes(filter.operator) && (
              <FilterValueInput
                field={field!}
                filter={filter}
                onChange={(value) => updateFilter(filter.id, { value })}
              />
            )}

            {/* Remove */}
            <button
              onClick={() => removeFilter(filter.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FilterValueInput({
  field,
  filter,
  onChange,
}: {
  field: { type: string; config: { options?: { label: string }[] } };
  filter: Filter;
  onChange: (value: unknown) => void;
}) {
  if (
    field.type === "select" &&
    ["is", "is_not"].includes(filter.operator)
  ) {
    return (
      <Select
        value={(filter.value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        options={(field.config.options || []).map((opt) => ({
          value: opt.label,
          label: opt.label,
        }))}
        placeholder="Select value"
        className="flex-1"
      />
    );
  }

  if (field.type === "date") {
    return (
      <Input
        type="date"
        value={(filter.value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
      />
    );
  }

  if (field.type === "number" || field.type === "currency") {
    return (
      <Input
        type="number"
        value={filter.value !== undefined ? String(filter.value) : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        placeholder="Value"
        className="flex-1"
      />
    );
  }

  return (
    <Input
      value={(filter.value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className="flex-1"
    />
  );
}
