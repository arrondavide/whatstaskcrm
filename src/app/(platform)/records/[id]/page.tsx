"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useRecord, useUpdateRecord, useDeleteRecord } from "@/hooks/queries/use-records";
import { useFields } from "@/hooks/queries/use-fields";
import { useAppUser } from "@/hooks/queries/use-auth";
import { FieldInput, FieldValueDisplay } from "@/components/records/field-input";

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: record, isLoading } = useRecord(id);
  const { data: fields } = useFields();
  const { data: appData } = useAppUser();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!record) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Record not found</div>;
  }

  const isEditing = editData !== null;

  const handleSave = () => {
    if (!editData) return;
    updateRecord.mutate({ id, data: editData }, {
      onSuccess: () => setEditData(null),
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    deleteRecord.mutate(id, {
      onSuccess: () => router.push("/records"),
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/records")}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {appData?.tenant?.recordLabelSingular ?? "Record"} Details
          </h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setEditData(null)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateRecord.isPending}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                <Save size={16} />
                {updateRecord.isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditData({ ...(record.data as Record<string, unknown>) })}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {(fields ?? []).map((field) => (
            <div key={field.id} className={field.type === "textarea" || field.type === "file" ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-400">{field.label}</label>
              {isEditing ? (
                <FieldInput
                  field={field}
                  value={editData[field.id]}
                  onChange={(val) => setEditData({ ...editData!, [field.id]: val })}
                />
              ) : (
                <div className="mt-1 text-sm text-white">
                  <FieldValueDisplay field={field} value={(record.data as Record<string, unknown>)[field.id]} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-gray-800 pt-4">
          <div className="grid gap-4 text-xs text-gray-500 sm:grid-cols-3">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date(record.createdAt).toLocaleString()}
            </div>
            {record.updatedAt && (
              <div>
                <span className="font-medium">Updated:</span>{" "}
                {new Date(record.updatedAt).toLocaleString()}
              </div>
            )}
            <div>
              <span className="font-medium">Version:</span> {record.version}
            </div>
          </div>
          {record.tags.length > 0 && (
            <div className="mt-3 flex gap-2">
              {record.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
