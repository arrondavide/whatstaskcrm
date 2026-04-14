"use client";

import { useState } from "react";
import { Plus, Search, Trash2, Eye, Download, Upload, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRecords, useDeleteRecord, useCreateRecord } from "@/hooks/queries/use-records";
import { useFields } from "@/hooks/queries/use-fields";
import { useAppUser } from "@/hooks/queries/use-auth";
import { FieldInput, FieldValueDisplay } from "@/components/records/field-input";
import { validateRecordData } from "@/lib/validate-record";
import { useSelectionStore } from "@/stores/selection-store";
import { FilterBuilder, QuickFilters, SavedViewsBar } from "@/components/records/filter-builder";
import { hasPermission } from "@/lib/permissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PermissionKey } from "@/types";

type FilterGroup = { match: "all" | "any"; filters: { fieldId: string; operator: string; value: unknown }[] };
import toast from "react-hot-toast";

export default function RecordsPage() {
  const { data: appData } = useAppUser();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicates, setDuplicates] = useState<{ id: string; data: Record<string, unknown>; duplicateScore: number; matchedFields: string[] }[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [newData, setNewData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({ match: "all", filters: [] });
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const { data: fieldsData } = useFields();
  const { data, isLoading } = useRecords({
    page,
    search: search || undefined,
    stage: activeStage || undefined,
    assignedTo: assignedToMe ? appData?.user?.id : undefined,
    sortField,
    sortDir,
    filters: filterGroup.filters.length > 0 ? filterGroup : undefined,
  });
  const deleteRecord = useDeleteRecord();
  const createRecord = useCreateRecord();
  const { selectedIds, toggle, deselectAll } = useSelectionStore();

  // Saved views
  const { data: savedViews } = useQuery({
    queryKey: ["views"],
    queryFn: async () => {
      const res = await fetch("/api/views");
      const d = await res.json();
      return (d.data ?? []) as { id: string; name: string; filters: FilterGroup; pinned: boolean }[];
    },
  });

  const saveView = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, filters: filterGroup }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["views"] });
      toast.success("View saved");
    },
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/views", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["views"] });
      if (activeViewId) setActiveViewId(null);
    },
  });

  const fields = fieldsData ?? [];
  const tableFields = fields.filter((f) => f.showInTable);
  const tenant = appData?.tenant;
  const perms = appData?.user?.permissions ?? {};

  const canCreate = hasPermission(perms, "records.create" as PermissionKey);
  const canDelete = hasPermission(perms, "records.delete" as PermissionKey);
  const canExport = hasPermission(perms, "records.export" as PermissionKey);
  const qc = useQueryClient();

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/records/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["records"] });
      deselectAll();
      toast.success(`${data.deleted} records deleted`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleExport = () => {
    window.open("/api/export", "_blank");
  };

  const doCreate = () => {
    const recordData: Record<string, unknown> = {};
    fields.forEach((f) => {
      const val = newData[f.id];
      if (val !== undefined && val !== null && val !== "") recordData[f.id] = val;
    });
    createRecord.mutate({ data: recordData }, {
      onSuccess: () => {
        setShowCreate(false);
        setNewData({});
        setFormErrors({});
        setDuplicates([]);
        setShowDuplicates(false);
      },
    });
  };

  const handleCreate = async () => {
    // Validate
    const errors = validateRecordData(newData, fields);
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {};
      errors.forEach((e) => { errorMap[e.fieldId] = e.message; });
      setFormErrors(errorMap);
      toast.error(errors[0].message);
      return;
    }
    setFormErrors({});

    // Check for duplicates
    try {
      const res = await fetch(`/api/records/duplicates?data=${encodeURIComponent(JSON.stringify(newData))}`);
      const d = await res.json();
      if (d.success && d.data.length > 0) {
        setDuplicates(d.data);
        setShowDuplicates(true);
        return; // Show duplicate warning instead of creating
      }
    } catch {
      // If duplicate check fails, just create
    }

    doCreate();
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{tenant?.recordLabel ?? "Records"}</h1>
          <p className="text-sm text-gray-400">{data?.total ?? 0} total</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search..."
              className="w-56 rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          {canCreate && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              <Upload size={16} />
              Import
            </button>
          )}
          {canExport && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              <Download size={16} />
              Export
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Plus size={16} />
              New {tenant?.recordLabelSingular ?? "Record"}
            </button>
          )}
        </div>
      </div>

      {/* Saved views bar */}
      <SavedViewsBar
        views={savedViews ?? []}
        activeViewId={activeViewId}
        onSelectView={(view) => {
          if (view) {
            setFilterGroup(view.filters);
            setActiveViewId(view.id);
          } else {
            setFilterGroup({ match: "all", filters: [] });
            setActiveViewId(null);
          }
          setPage(1);
        }}
        onDeleteView={(id) => deleteView.mutate(id)}
      />

      {/* Quick filters + Filter builder */}
      <div className="mb-4 space-y-3">
        <QuickFilters
          fields={fields}
          pipelineStages={tenant?.pipelineConfig?.stages}
          activeStage={activeStage}
          onStageChange={(s) => { setActiveStage(s); setPage(1); }}
          assignedToMe={assignedToMe}
          onAssignedToMeChange={(v) => { setAssignedToMe(v); setPage(1); }}
        />
        <FilterBuilder
          fields={fields}
          filterGroup={filterGroup}
          onChange={(g) => { setFilterGroup(g); setPage(1); }}
          onSaveView={(name) => saveView.mutate(name)}
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-violet-800 bg-violet-900/20 px-4 py-2">
          <span className="text-sm text-violet-300">{selectedIds.size} selected</span>
          {canDelete && (
            <button
              onClick={() => {
                if (!confirm(`Delete ${selectedIds.size} records?`)) return;
                bulkDelete.mutate(Array.from(selectedIds));
              }}
              disabled={bulkDelete.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {bulkDelete.isPending ? "Deleting..." : "Delete Selected"}
            </button>
          )}
          <button
            onClick={deselectAll}
            className="ml-auto text-xs text-gray-400 hover:text-white"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Duplicate warning modal */}
      {showDuplicates && duplicates.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-amber-800 bg-gray-900 p-6">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={20} />
              <h2 className="text-lg font-bold">Possible Duplicates Found</h2>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              We found {duplicates.length} record(s) that may already exist:
            </p>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {duplicates.map((dup) => {
                const firstField = fields.find((f) => f.showInTable);
                return (
                  <div key={dup.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {firstField ? String(dup.data[firstField.id] ?? "Untitled") : dup.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-amber-400/70">
                        Matched: {dup.matchedFields.join(", ")} ({dup.duplicateScore}% match)
                      </p>
                    </div>
                    <a
                      href={`/records/${dup.id}`}
                      target="_blank"
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      View
                    </a>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowDuplicates(false); setDuplicates([]); }}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowDuplicates(false); doCreate(); }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Create Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">Import from CSV</h2>
            <p className="mt-1 text-sm text-gray-400">
              Upload a CSV file. Column headers must match your field labels exactly.
            </p>

            <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800 p-3">
              <p className="text-xs font-medium text-gray-300">Your field labels:</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {fields.map((f) => (
                  <span key={f.id} className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] text-gray-300">
                    {f.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-gray-500">
                For multi-select fields, separate values with semicolons (;). Boolean fields accept: true/yes/1.
              </p>
            </div>

            <div className="mt-4">
              <input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImporting(true);
                  try {
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetch("/api/import", { method: "POST", body: formData });
                    const data = await res.json();
                    if (!data.success) {
                      toast.error(data.error?.message ?? "Import failed");
                    } else {
                      toast.success(`Imported ${data.data.imported} records`);
                      if (data.data.unmappedHeaders?.length > 0) {
                        toast(`Skipped columns: ${data.data.unmappedHeaders.join(", ")}`, { icon: "⚠️" });
                      }
                      qc.invalidateQueries({ queryKey: ["records"] });
                      setShowImport(false);
                    }
                  } catch {
                    toast.error("Import failed");
                  } finally {
                    setImporting(false);
                  }
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:px-3 file:py-1 file:text-sm file:font-medium file:text-white hover:file:bg-violet-700"
                disabled={importing}
              />
              {importing && (
                <p className="mt-2 text-sm text-violet-400">Importing...</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowImport(false)}
                disabled={importing}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">
              New {tenant?.recordLabelSingular ?? "Record"}
            </h2>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
              {fields.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No fields defined yet. Go to Settings → Fields to create fields first.
                </p>
              ) : (
                fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-300">
                      {field.label}
                      {field.required && <span className="text-red-400"> *</span>}
                    </label>
                    <FieldInput
                      field={field}
                      value={newData[field.id]}
                      onChange={(val) => {
                        setNewData({ ...newData, [field.id]: val });
                        if (formErrors[field.id]) {
                          const next = { ...formErrors };
                          delete next[field.id];
                          setFormErrors(next);
                        }
                      }}
                    />
                    {formErrors[field.id] && (
                      <p className="mt-1 text-xs text-red-400">{formErrors[field.id]}</p>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setNewData({}); }}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createRecord.isPending || fields.length === 0}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {createRecord.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-400">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      useSelectionStore.getState().selectAll(data?.items.map((r) => r.id) ?? []);
                    } else {
                      deselectAll();
                    }
                  }}
                  className="rounded border-gray-600"
                />
              </th>
              {tableFields.map((f) => (
                <th
                  key={f.id}
                  className="cursor-pointer px-4 py-3 font-medium text-gray-400 hover:text-white select-none"
                  onClick={() => {
                    if (sortField === f.id) {
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                    } else {
                      setSortField(f.id);
                      setSortDir("asc");
                    }
                    setPage(1);
                  }}
                >
                  {f.label}
                  {sortField === f.id && (
                    <span className="ml-1 text-violet-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
              <th
                className="cursor-pointer px-4 py-3 font-medium text-gray-400 hover:text-white select-none"
                onClick={() => {
                  if (!sortField || sortField === "createdAt") {
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  }
                  setSortField(undefined);
                  setPage(1);
                }}
              >
                Created
                {(!sortField || sortField === "createdAt") && (
                  <span className="ml-1 text-violet-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
              <th className="px-4 py-3 font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={tableFields.length + 3} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={tableFields.length + 3} className="px-4 py-8 text-center text-gray-500">
                  No {(tenant?.recordLabel ?? "records").toLowerCase()} found.
                  {canCreate && " Click the button above to create one."}
                </td>
              </tr>
            ) : (
              data.items.map((record) => (
                <tr key={record.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggle(record.id)}
                      className="rounded border-gray-600"
                    />
                  </td>
                  {tableFields.map((f) => (
                    <td key={f.id} className="max-w-[200px] px-4 py-3 text-gray-300">
                      <FieldValueDisplay field={f} value={record.data[f.id]} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link
                        href={`/records/${record.id}`}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <Eye size={16} />
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => deleteRecord.mutate(record.id)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-900/30 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= data.totalPages}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
