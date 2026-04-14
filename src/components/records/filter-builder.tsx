"use client";

import { useState } from "react";
import { Plus, X, Filter, Save, Bookmark } from "lucide-react";
import type { FieldItem } from "@/hooks/queries/use-fields";

type FilterType = { fieldId: string; operator: string; value: unknown };
type FilterGroup = { match: "all" | "any"; filters: FilterType[] };

// Operators organized by field type
const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  textarea: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  currency: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  date: [
    { value: "equals", label: "is" },
    { value: "gt", label: "is after" },
    { value: "lt", label: "is before" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  select: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "in", label: "is any of" },
    { value: "not_in", label: "is none of" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  multi_select: [
    { value: "contains", label: "includes" },
    { value: "not_contains", label: "does not include" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  boolean: [
    { value: "equals", label: "is" },
  ],
  email: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  phone: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "is" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  url: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "is" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  file: [
    { value: "is_empty", label: "has no file" },
    { value: "is_not_empty", label: "has file" },
  ],
};

function getOperators(fieldType: string) {
  return OPERATORS_BY_TYPE[fieldType] ?? OPERATORS_BY_TYPE.text;
}

function needsValue(operator: string) {
  return !["is_empty", "is_not_empty"].includes(operator);
}

type SelectOption = { label: string; value: string };

function getFieldOptions(field: FieldItem): SelectOption[] {
  return (field.config as { options?: SelectOption[] })?.options ?? [];
}

// ── Filter Value Input ───────────────────────────────

function FilterValueInput({
  field,
  operator,
  value,
  onChange,
}: {
  field: FieldItem;
  operator: string;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (!needsValue(operator)) return null;

  const inputClass = "w-full rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none";

  switch (field.type) {
    case "select": {
      const options = getFieldOptions(field);
      if (operator === "in" || operator === "not_in") {
        // Multi-select for "is any of" / "is none of"
        const selected: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (selected.includes(opt.value)) {
                    onChange(selected.filter((v) => v !== opt.value));
                  } else {
                    onChange([...selected, opt.value]);
                  }
                }}
                className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                  selected.includes(opt.value)
                    ? "bg-violet-600 text-white"
                    : "border border-gray-700 text-gray-400 hover:border-violet-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    case "multi_select": {
      const options = getFieldOptions(field);
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    case "boolean":
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );

    case "date":
      return <input type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass} />;

    case "number":
    case "currency":
      return <input type="number" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass} />;

    default:
      return <input type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="Value..." className={inputClass} />;
  }
}

// ── Main Filter Builder ──────────────────────────────

type FilterBuilderProps = {
  fields: FieldItem[];
  filterGroup: FilterGroup;
  onChange: (group: FilterGroup) => void;
  onSaveView?: (name: string) => void;
};

export function FilterBuilder({ fields, filterGroup, onChange, onSaveView }: FilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const filterableFields = fields.filter((f) => f.filterable);
  const activeCount = filterGroup.filters.length;

  const addFilter = () => {
    if (filterableFields.length === 0) return;
    const firstField = filterableFields[0];
    const ops = getOperators(firstField.type);
    onChange({
      ...filterGroup,
      filters: [
        ...filterGroup.filters,
        { fieldId: firstField.id, operator: ops[0].value, value: "" },
      ],
    });
  };

  const updateFilter = (index: number, updates: Partial<FilterType>) => {
    const next = [...filterGroup.filters];
    next[index] = { ...next[index], ...updates };

    // If field changed, reset operator and value
    if (updates.fieldId) {
      const field = fields.find((f) => f.id === updates.fieldId);
      if (field) {
        const ops = getOperators(field.type);
        next[index].operator = ops[0].value;
        next[index].value = "";
      }
    }

    onChange({ ...filterGroup, filters: next });
  };

  const removeFilter = (index: number) => {
    onChange({
      ...filterGroup,
      filters: filterGroup.filters.filter((_, i) => i !== index),
    });
  };

  const clearAll = () => {
    onChange({ match: "all", filters: [] });
  };

  return (
    <div>
      {/* Toggle button + active chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
            activeCount > 0
              ? "border-violet-600 bg-violet-600/10 text-violet-400"
              : "border-gray-700 text-gray-400 hover:bg-gray-800"
          }`}
        >
          <Filter size={14} />
          Filter
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* Active filter chips */}
        {filterGroup.filters.map((filter, i) => {
          const field = fields.find((f) => f.id === filter.fieldId);
          if (!field) return null;
          const ops = getOperators(field.type);
          const opLabel = ops.find((o) => o.value === filter.operator)?.label ?? filter.operator;
          const displayValue = needsValue(filter.operator)
            ? Array.isArray(filter.value)
              ? (filter.value as string[]).join(", ")
              : String(filter.value)
            : "";

          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-300"
            >
              <span className="font-medium text-white">{field.label}</span>
              <span className="text-gray-500">{opLabel}</span>
              {displayValue && <span className="text-violet-400">{displayValue}</span>}
              <button onClick={() => removeFilter(i)} className="ml-0.5 text-gray-500 hover:text-white">
                <X size={12} />
              </button>
            </span>
          );
        })}

        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-gray-500 hover:text-white">
            Clear all
          </button>
        )}
      </div>

      {/* Filter panel */}
      {isOpen && (
        <div className="mt-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
          {/* AND/OR toggle */}
          {filterGroup.filters.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Match</span>
              <div className="flex rounded-lg border border-gray-700">
                <button
                  onClick={() => onChange({ ...filterGroup, match: "all" })}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    filterGroup.match === "all"
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  All (AND)
                </button>
                <button
                  onClick={() => onChange({ ...filterGroup, match: "any" })}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    filterGroup.match === "any"
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Any (OR)
                </button>
              </div>
              <span className="text-xs text-gray-500">of the following</span>
            </div>
          )}

          {/* Filter rows */}
          <div className="space-y-2">
            {filterGroup.filters.map((filter, i) => {
              const field = fields.find((f) => f.id === filter.fieldId);
              const ops = field ? getOperators(field.type) : [];

              return (
                <div key={i} className="flex items-start gap-2">
                  {/* Field selector */}
                  <select
                    value={filter.fieldId}
                    onChange={(e) => updateFilter(i, { fieldId: e.target.value })}
                    className="w-36 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {filterableFields.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>

                  {/* Operator selector */}
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(i, { operator: e.target.value, value: "" })}
                    className="w-32 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                  >
                    {ops.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>

                  {/* Value input */}
                  {field && (
                    <div className="flex-1">
                      <FilterValueInput
                        field={field}
                        operator={filter.operator}
                        value={filter.value}
                        onChange={(val) => updateFilter(i, { value: val })}
                      />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeFilter(i)}
                    className="mt-1 rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={addFilter}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
            >
              <Plus size={12} />
              Add filter
            </button>

            {onSaveView && activeCount > 0 && (
              <div className="flex items-center gap-2">
                {showSave ? (
                  <>
                    <input
                      type="text"
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      placeholder="View name..."
                      className="w-32 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && viewName) {
                          onSaveView(viewName);
                          setViewName("");
                          setShowSave(false);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (viewName) {
                          onSaveView(viewName);
                          setViewName("");
                          setShowSave(false);
                        }
                      }}
                      disabled={!viewName}
                      className="rounded-md bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={() => setShowSave(false)} className="text-xs text-gray-500 hover:text-white">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowSave(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                  >
                    <Save size={12} />
                    Save as view
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Filters ────────────────────────────────────

type QuickFiltersProps = {
  fields?: FieldItem[];
  pipelineStages?: { id: string; name: string; color: string }[];
  activeStage: string | null;
  onStageChange: (stage: string | null) => void;
  assignedToMe: boolean;
  onAssignedToMeChange: (val: boolean) => void;
};

export function QuickFilters({
  pipelineStages,
  activeStage,
  onStageChange,
  assignedToMe,
  onAssignedToMeChange,
}: QuickFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Pipeline stage tabs */}
      {pipelineStages && pipelineStages.length > 0 && (
        <div className="flex items-center gap-1 rounded-lg border border-gray-800 p-0.5">
          <button
            onClick={() => onStageChange(null)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              !activeStage ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          {pipelineStages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => onStageChange(activeStage === stage.id ? null : stage.id)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeStage === stage.id ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
              {stage.name}
            </button>
          ))}
        </div>
      )}

      {/* Assigned to me */}
      <button
        onClick={() => onAssignedToMeChange(!assignedToMe)}
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
          assignedToMe
            ? "border-violet-600 bg-violet-600/10 text-violet-400"
            : "border-gray-700 text-gray-400 hover:bg-gray-800"
        }`}
      >
        Assigned to me
      </button>
    </div>
  );
}

// ── Saved Views Bar ──────────────────────────────────

type SavedView = {
  id: string;
  name: string;
  filters: FilterGroup;
  pinned: boolean;
};

type SavedViewsBarProps = {
  views: SavedView[];
  activeViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  onDeleteView: (id: string) => void;
};

export function SavedViewsBar({ views, activeViewId, onSelectView, onDeleteView }: SavedViewsBarProps) {
  if (views.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <Bookmark size={14} className="mr-1 flex-shrink-0 text-gray-600" />
      <button
        onClick={() => onSelectView(null)}
        className={`flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          !activeViewId ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
        }`}
      >
        All
      </button>
      {views.map((view) => (
        <div key={view.id} className="group flex flex-shrink-0 items-center">
          <button
            onClick={() => onSelectView(activeViewId === view.id ? null : view)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeViewId === view.id ? "bg-violet-600/20 text-violet-400" : "text-gray-400 hover:text-white"
            }`}
          >
            {view.name}
          </button>
          <button
            onClick={() => onDeleteView(view.id)}
            className="ml-0.5 hidden rounded p-0.5 text-gray-600 hover:text-red-400 group-hover:block"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
