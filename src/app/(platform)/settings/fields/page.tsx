"use client";

import { useState } from "react";
import { Plus, GripVertical, Trash2, Pencil } from "lucide-react";
import { useFields, useCreateField } from "@/hooks/queries/use-fields";

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
};

export default function FieldsSettingsPage() {
  const { data: fields, isLoading } = useFields();
  const createField = useCreateField();
  const [showCreate, setShowCreate] = useState(false);
  const [newField, setNewField] = useState({ label: "", type: "text", required: false });
  const [options, setOptions] = useState<string[]>([""]);

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
                <input
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Full Name"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Type</label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
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
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...options];
                          next[i] = e.target.value;
                          setOptions(next);
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                      />
                      {options.length > 1 && (
                        <button
                          onClick={() => setOptions(options.filter((_, j) => j !== i))}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setOptions([...options, ""])}
                    className="mt-2 text-sm text-violet-400 hover:text-violet-300"
                  >
                    + Add option
                  </button>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded border-gray-600"
                />
                <span className="text-sm text-gray-300">Required</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newField.label || createField.isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {createField.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fields list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading fields...</div>
        ) : !fields?.length ? (
          <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center">
            <p className="text-gray-400">No fields yet. Add your first field to define your record structure.</p>
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4"
            >
              <GripVertical size={16} className="cursor-grab text-gray-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{field.label}</span>
                  {field.required && (
                    <span className="rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-400">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {fieldTypeLabels[field.type] ?? field.type} · Order: {field.fieldOrder}
                </p>
              </div>
              <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                {fieldTypeLabels[field.type] ?? field.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
