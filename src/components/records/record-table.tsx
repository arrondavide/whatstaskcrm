"use client";

import { useMemo } from "react";
import { useTenantStore } from "@/stores/tenant-store";
import { useRecordStore } from "@/stores/record-store";
import { applyFilters } from "@/utils/filter-engine";
import { cn } from "@/utils/cn";
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import type { CrmRecord } from "@/types/record";
import type { Field } from "@/types/field";

interface RecordTableProps {
  onRecordClick: (record: CrmRecord) => void;
  onEdit: (record: CrmRecord) => void;
  onDelete: (record: CrmRecord) => void;
  onExport: (record: CrmRecord) => void;
}

export function RecordTable({
  onRecordClick,
  onEdit,
  onDelete,
  onExport,
}: RecordTableProps) {
  const { fields } = useTenantStore();
  const {
    records,
    activeFilters,
    activeSort,
    searchQuery,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
  } = useRecordStore();

  const visibleFields = fields.filter((f) => f.show_in_table);

  // Apply filters
  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => !r.meta.deleted);

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((record) =>
        Object.values(record.data).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        )
      );
    }

    // Apply filters
    result = applyFilters(result, activeFilters, fields);

    // Apply sort
    if (activeSort.length > 0) {
      result = [...result].sort((a, b) => {
        for (const sort of activeSort) {
          const aVal = a.data[sort.field_id];
          const bVal = b.data[sort.field_id];
          const aStr = String(aVal ?? "");
          const bStr = String(bVal ?? "");
          const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
          if (cmp !== 0) {
            return sort.direction === "asc" ? cmp : -cmp;
          }
        }
        return 0;
      });
    }

    return result;
  }, [records, activeFilters, activeSort, searchQuery, fields]);

  const allSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((r) => selectedIds.includes(r.id));

  if (records.length === 0) {
    return (
      <EmptyState
        icon={<Database className="h-12 w-12" />}
        title="No records yet"
        description="Add your first record to get started"
      />
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <EmptyState
        icon={<Database className="h-12 w-12" />}
        title="No matching records"
        description="Try adjusting your filters or search query"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {/* Checkbox column */}
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => (allSelected ? clearSelection() : selectAll())}
                className="h-4 w-4 rounded border-input"
              />
            </th>

            {/* Dynamic columns */}
            {visibleFields.map((field) => (
              <ColumnHeader key={field.id} field={field} />
            ))}

            {/* Actions column */}
            <th className="w-10 px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((record) => (
            <tr
              key={record.id}
              className="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
              onClick={() => onRecordClick(record)}
            >
              {/* Checkbox */}
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(record.id)}
                  onChange={() => toggleSelected(record.id)}
                  className="h-4 w-4 rounded border-input"
                />
              </td>

              {/* Dynamic cells */}
              {visibleFields.map((field) => (
                <td key={field.id} className="px-3 py-3 text-sm">
                  <CellValue field={field} value={record.data[field.id]} />
                </td>
              ))}

              {/* Actions */}
              <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  trigger={
                    <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownItem onClick={() => onEdit(record)}>
                    Edit
                  </DropdownItem>
                  <DropdownItem onClick={() => onExport(record)}>
                    Export
                  </DropdownItem>
                  <DropdownItem onClick={() => onDelete(record)} destructive>
                    Delete
                  </DropdownItem>
                </Dropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnHeader({ field }: { field: Field }) {
  const { activeSort, setActiveSort } = useRecordStore();
  const currentSort = activeSort.find((s) => s.field_id === field.id);

  function toggleSort() {
    if (!currentSort) {
      setActiveSort([{ field_id: field.id, direction: "asc" }]);
    } else if (currentSort.direction === "asc") {
      setActiveSort([{ field_id: field.id, direction: "desc" }]);
    } else {
      setActiveSort([]);
    }
  }

  return (
    <th className="px-3 py-3 text-left">
      <button
        onClick={toggleSort}
        className="flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground hover:text-foreground"
      >
        {field.label}
        {!currentSort && <ArrowUpDown className="h-3 w-3" />}
        {currentSort?.direction === "asc" && <ArrowUp className="h-3 w-3" />}
        {currentSort?.direction === "desc" && <ArrowDown className="h-3 w-3" />}
      </button>
    </th>
  );
}

function CellValue({ field, value }: { field: Field; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (field.type) {
    case "boolean":
      return (
        <Badge variant={value ? "success" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );

    case "select":
      return <Badge variant="outline">{String(value)}</Badge>;

    case "multi_select":
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((v) => (
            <Badge key={v} variant="outline" className="text-xs">
              {v}
            </Badge>
          ))}
        </div>
      );

    case "file":
      const files = Array.isArray(value) ? value : [value];
      return (
        <span className="text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </span>
      );

    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );

    case "currency":
      return (
        <span>
          {field.config.currency || "$"}
          {Number(value).toLocaleString()}
        </span>
      );

    default:
      return <span className="truncate">{String(value)}</span>;
  }
}
