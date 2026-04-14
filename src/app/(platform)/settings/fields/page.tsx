"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Save, X, ChevronUp, ChevronDown } from "lucide-react";
import { useFields, useCreateField, type FieldItem } from "@/hooks/queries/use-fields";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  textarea: "Long Text",
  number: "Number",
  phone: "Phone",
  email: "Email",
  date: "Date",
  select: "Select",
  multi_select: "Multi Select",
  file: "File",
  url: "URL",
  currency: "Currency",
  boolean: "Yes/No",
  formula: "Formula",
};

export default function FieldsSettingsPage() {
  const { data: fields, isLoading } = useFields();
  const createField = useCreateField();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingField, setEditingField] = useState<FieldItem | null>(null);
  const [newField, setNewField] = useState({ label: "", type: "text", required: false });
  const [editForm, setEditForm] = useState({ label: "", required: false, showInTable: true, filterable: true });
  const [options, setOptions] = useState<string[]>([""]);
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [localOrder, setLocalOrder] = useState<FieldItem[] | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);

  // Use local order if we're rearranging, otherwise use server data
  const displayFields = localOrder ?? fields ?? [];

  const reorderFields = useMutation({
    mutationFn: async (fieldIds: string[]) => {
      const res = await fetch("/api/fields/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldIds }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields"] });
      setLocalOrder(null);
      setOrderDirty(false);
      toast.success("Field order saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const moveField = (index: number, direction: "up" | "down") => {
    const arr = [...(localOrder ?? fields ?? [])];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= arr.length) return;
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    setLocalOrder(arr);
    setOrderDirty(true);
  };

  const saveOrder = () => {
    if (!localOrder) return;
    reorderFields.mutate(localOrder.map((f) => f.id));
  };

  const updateField = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; label?: string; required?: boolean; showInTable?: boolean; filterable?: boolean; config?: Record<string, unknown> }) => {
      const res = await fetch(`/api/fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields"] });
      setEditingField(null);
      toast.success("Field updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fields/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields"] });
      toast.success("Field deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = () => {
    const config: Record<string, unknown> = {};
    if (newField.type === "select" || newField.type === "multi_select") {
      config.options = options
        .filter(Boolean)
        .map((o) => ({ label: o, value: o.toLowerCase().replace(/\s+/g, "_") }));
    }
    createField.mutate(
      { label: newField.label, type: newField.type, required: newField.required, config },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewField({ label: "", type: "text", required: false });
          setOptions([""]);
        },
      }
    );
  };

  const startEdit = (field: FieldItem) => {
    setEditingField(field);
    setEditForm({
      label: field.label,
      required: field.required,
      showInTable: field.showInTable,
      filterable: field.filterable,
    });
    const opts = (field.config as { options?: { label: string }[] })?.options;
    setEditOptions(opts?.map((o) => o.label) ?? []);
  };

  const handleSaveEdit = () => {
    if (!editingField) return;
    const config: Record<string, unknown> = { ...(editingField.config as Record<string, unknown>) };
    if (editingField.type === "select" || editingField.type === "multi_select") {
      config.options = editOptions
        .filter(Boolean)
        .map((o) => ({ label: o, value: o.toLowerCase().replace(/\s+/g, "_") }));
    }
    updateField.mutate({
      id: editingField.id,
      label: editForm.label,
      required: editForm.required,
      showInTable: editForm.showInTable,
      filterable: editForm.filterable,
      config,
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Fields</h1>
          <p className="text-sm text-gray-400">Define the data structure for your records</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">New Field</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Label</label>
                <input type="text" value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} placeholder="e.g., Full Name" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Type</label>
                <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none">
                  {Object.entries(fieldTypeLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              {(newField.type === "select" || newField.type === "multi_select") && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">Options</label>
                  {options.map((opt, i) => (
                    <div key={i} className="mt-1 flex gap-2">
                      <input type="text" value={opt} onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }} placeholder={`Option ${i + 1}`} className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
                      {options.length > 1 && (
                        <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setOptions([...options, ""])} className="mt-2 text-sm text-violet-400 hover:text-violet-300">+ Add option</button>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={newField.required} onChange={(e) => setNewField({ ...newField, required: e.target.checked })} className="rounded border-gray-600" />
                <span className="text-sm text-gray-300">Required</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={!newField.label || createField.isPending} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                {createField.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">Edit Field</h2>
            <p className="text-xs text-gray-500">Type: {fieldTypeLabels[editingField.type] ?? editingField.type}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Label</label>
                <input type="text" value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              {(editingField.type === "select" || editingField.type === "multi_select") && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">Options</label>
                  {editOptions.map((opt, i) => (
                    <div key={i} className="mt-1 flex gap-2">
                      <input type="text" value={opt} onChange={(e) => { const next = [...editOptions]; next[i] = e.target.value; setEditOptions(next); }} placeholder={`Option ${i + 1}`} className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
                      {editOptions.length > 1 && (
                        <button onClick={() => setEditOptions(editOptions.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setEditOptions([...editOptions, ""])} className="mt-2 text-sm text-violet-400 hover:text-violet-300">+ Add option</button>
                </div>
              )}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editForm.required} onChange={(e) => setEditForm({ ...editForm, required: e.target.checked })} className="rounded border-gray-600" />
                  <span className="text-sm text-gray-300">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editForm.showInTable} onChange={(e) => setEditForm({ ...editForm, showInTable: e.target.checked })} className="rounded border-gray-600" />
                  <span className="text-sm text-gray-300">Show in table</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editForm.filterable} onChange={(e) => setEditForm({ ...editForm, filterable: e.target.checked })} className="rounded border-gray-600" />
                  <span className="text-sm text-gray-300">Filterable</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingField(null)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={handleSaveEdit} disabled={!editForm.label || updateField.isPending} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                <Save size={14} />
                {updateField.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save order button */}
      {orderDirty && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-violet-800 bg-violet-900/20 px-4 py-2">
          <span className="text-sm text-violet-300">Field order changed</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setLocalOrder(null); setOrderDirty(false); }}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={saveOrder}
              disabled={reorderFields.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Save size={12} />
              {reorderFields.isPending ? "Saving..." : "Save Order"}
            </button>
          </div>
        </div>
      )}

      {/* Fields list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading fields...</div>
        ) : !displayFields.length ? (
          <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center">
            <p className="text-gray-400">No fields yet. Add your first field to define your record structure.</p>
          </div>
        ) : (
          displayFields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4"
            >
              {/* Up/Down arrows */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveField(index, "up")}
                  disabled={index === 0}
                  className="rounded p-0.5 text-gray-600 hover:bg-gray-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-600"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveField(index, "down")}
                  disabled={index === displayFields.length - 1}
                  className="rounded p-0.5 text-gray-600 hover:bg-gray-800 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-600"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-600 w-5">{index + 1}</span>
                  <span className="font-medium text-white">{field.label}</span>
                  {field.required && (
                    <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">Required</span>
                  )}
                  {!field.showInTable && (
                    <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">Hidden</span>
                  )}
                </div>
                <p className="ml-5 text-xs text-gray-500">{fieldTypeLabels[field.type] ?? field.type}</p>
              </div>
              <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                {fieldTypeLabels[field.type] ?? field.type}
              </span>
              <button
                onClick={() => startEdit(field)}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white"
                title="Edit field"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  if (!confirm(`Delete field "${field.label}"? Data in existing records won't be removed but won't display.`)) return;
                  deleteField.mutate(field.id);
                }}
                className="rounded-md p-1.5 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                title="Delete field"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
