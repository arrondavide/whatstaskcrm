"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RecordTable } from "@/components/records/record-table";
import { RecordForm } from "@/components/records/record-form";
import { FilterBuilder } from "@/components/filters/filter-builder";
import { SavedViews } from "@/components/filters/saved-views";
import { useTenantStore } from "@/stores/tenant-store";
import { useRecordStore } from "@/stores/record-store";
import { Plus, Search, Download } from "lucide-react";
import toast from "react-hot-toast";
import type { CrmRecord } from "@/types/record";

export default function RecordsPage() {
  const router = useRouter();
  const { tenant } = useTenantStore();
  const { searchQuery, setSearchQuery, addRecord, removeRecord } = useRecordStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CrmRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CrmRecord | null>(null);

  const label = tenant?.record_label || "Records";
  const singularLabel = tenant?.record_label_singular || "Record";

  async function handleCreate(data: { [key: string]: unknown }) {
    // TODO: Save to Firestore
    const newRecord: CrmRecord = {
      id: `rec_${Date.now()}`,
      tenant_id: tenant?.id || "",
      data,
      meta: {
        created_by: "",
        created_at: new Date().toISOString(),
        updated_by: "",
        updated_at: new Date().toISOString(),
        deleted: false,
        version: 1,
      },
    };
    addRecord(newRecord);
    setShowCreateModal(false);
    toast.success(`${singularLabel} created`);
  }

  async function handleEdit(data: { [key: string]: unknown }) {
    if (!editingRecord) return;
    // TODO: Update in Firestore + create audit log
    setEditingRecord(null);
    toast.success(`${singularLabel} updated`);
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    // TODO: Soft delete in Firestore + create audit log
    removeRecord(deleteConfirm.id);
    setDeleteConfirm(null);
    toast.success(`${singularLabel} deleted`);
  }

  function handleExport(record: CrmRecord) {
    // TODO: Generate PDF certificate
    toast.success("Export started");
  }

  return (
    <Shell
      title={label}
      description={`Manage your ${label.toLowerCase()}`}
      actions={
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add {singularLabel}
        </Button>
      }
    >
      {/* Search + Views */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SavedViews />
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <FilterBuilder />
      </div>

      {/* Table */}
      <RecordTable
        onRecordClick={(record) => router.push(`/records/${record.id}`)}
        onEdit={(record) => setEditingRecord(record)}
        onDelete={(record) => setDeleteConfirm(record)}
        onExport={handleExport}
      />

      {/* Create modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`Add ${singularLabel}`}
        size="lg"
      >
        <RecordForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          submitLabel={`Create ${singularLabel}`}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title={`Edit ${singularLabel}`}
        size="lg"
      >
        {editingRecord && (
          <RecordForm
            initialData={editingRecord.data}
            onSubmit={handleEdit}
            onCancel={() => setEditingRecord(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={`Delete ${singularLabel}`}
        description={`Are you sure you want to delete this ${singularLabel.toLowerCase()}? This action can be undone by an admin.`}
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
