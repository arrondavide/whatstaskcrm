"use client";

import { useState } from "react";
import { Plus, Search, Trash2, Eye, Download } from "lucide-react";
import Link from "next/link";
import { useRecords, useDeleteRecord, useCreateRecord } from "@/hooks/queries/use-records";
import { useFields } from "@/hooks/queries/use-fields";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useFilterStore } from "@/stores/filter-store";
import { useSelectionStore } from "@/stores/selection-store";
import { hasPermission } from "@/lib/permissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PermissionKey } from "@/types";
import toast from "react-hot-toast";

export default function RecordsPage() {
  const { data: appData } = useAppUser();
  const { search, setSearch } = useFilterStore();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newData, setNewData] = useState<Record<string, string>>({});

  const { data: fieldsData } = useFields();
  const { data, isLoading } = useRecords({ page, search: search || undefined });
  const deleteRecord = useDeleteRecord();
  const createRecord = useCreateRecord();
  const { selectedIds, toggle, deselectAll } = useSelectionStore();

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

  const handleCreate = () => {
    const recordData: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (newData[f.id]) recordData[f.id] = newData[f.id];
    });
    createRecord.mutate({ data: recordData }, {
      onSuccess: () => {
        setShowCreate(false);
        setNewData({});
      },
    });
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
                    {field.type === "textarea" ? (
                      <textarea
                        value={newData[field.id] ?? ""}
                        onChange={(e) => setNewData({ ...newData, [field.id]: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                      />
                    ) : field.type === "boolean" ? (
                      <label className="mt-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newData[field.id] === "true"}
                          onChange={(e) => setNewData({ ...newData, [field.id]: String(e.target.checked) })}
                          className="rounded border-gray-600"
                        />
                        <span className="text-sm text-gray-300">Yes</span>
                      </label>
                    ) : (
                      <input
                        type={field.type === "number" || field.type === "currency" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                        value={newData[field.id] ?? ""}
                        onChange={(e) => setNewData({ ...newData, [field.id]: e.target.value })}
                        placeholder={field.label}
                        className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                      />
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
                <th key={f.id} className="px-4 py-3 font-medium text-gray-400">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-gray-400">Created</th>
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
                    <td key={f.id} className="max-w-[200px] truncate px-4 py-3 text-gray-300">
                      {String(record.data[f.id] ?? "—")}
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
