"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useTenantStore } from "@/stores/tenant-store";
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Edit,
  Trash2,
  Database,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { v4 as uuid } from "uuid";
import type { Field, FieldType, SelectOption } from "@/types/field";

const fieldTypeOptions = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-Select" },
  { value: "file", label: "File Upload" },
  { value: "url", label: "URL" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Yes/No" },
];

export default function FieldsSettingsPage() {
  const { fields, addField, updateField, removeField } = useTenantStore();
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [filterable, setFilterable] = useState(true);
  const [searchable, setSearchable] = useState(true);
  const [showInTable, setShowInTable] = useState(true);
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [maxSizeMb, setMaxSizeMb] = useState(10);
  const [currency, setCurrency] = useState("USD");
  const [includeTime, setIncludeTime] = useState(false);

  function resetForm() {
    setLabel("");
    setType("text");
    setRequired(false);
    setSensitive(false);
    setFilterable(true);
    setSearchable(true);
    setShowInTable(true);
    setOptions([]);
    setNewOptionLabel("");
    setPlaceholder("");
    setMultiple(false);
    setMaxSizeMb(10);
    setCurrency("USD");
    setIncludeTime(false);
    setEditingField(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(field: Field) {
    setEditingField(field);
    setLabel(field.label);
    setType(field.type);
    setRequired(field.required);
    setSensitive(field.sensitive);
    setFilterable(field.filterable);
    setSearchable(field.searchable);
    setShowInTable(field.show_in_table);
    setOptions(field.config.options || []);
    setPlaceholder(field.config.placeholder || "");
    setMultiple(field.config.multiple || false);
    setMaxSizeMb(field.config.max_size_mb || 10);
    setCurrency(field.config.currency || "USD");
    setIncludeTime(field.config.include_time || false);
    setShowModal(true);
  }

  function addOption() {
    if (!newOptionLabel.trim()) return;
    setOptions([...options, { label: newOptionLabel.trim() }]);
    setNewOptionLabel("");
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!label.trim()) {
      toast.error("Field label is required");
      return;
    }

    const fieldData: Field = {
      id: editingField?.id || `field_${uuid()}`,
      label: label.trim(),
      type,
      order: editingField?.order || fields.length,
      required,
      sensitive,
      filterable,
      searchable,
      show_in_table: showInTable,
      config: {
        options: ["select", "multi_select"].includes(type) ? options : undefined,
        placeholder: placeholder || undefined,
        multiple: type === "file" ? multiple : undefined,
        max_size_mb: type === "file" ? maxSizeMb : undefined,
        currency: type === "currency" ? currency : undefined,
        include_time: type === "date" ? includeTime : undefined,
      },
      created_at: editingField?.created_at || new Date().toISOString(),
      created_by: editingField?.created_by || "",
    };

    if (editingField) {
      updateField(editingField.id, fieldData);
      toast.success("Field updated");
    } else {
      addField(fieldData);
      toast.success("Field created");
    }

    setShowModal(false);
    resetForm();
  }

  function handleDelete(field: Field) {
    removeField(field.id);
    toast.success("Field deleted");
  }

  return (
    <Shell
      title="Fields"
      description="Define the fields for your records"
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
      }
    >
      {fields.length === 0 ? (
        <EmptyState
          icon={<Database className="h-12 w-12" />}
          title="No fields defined yet"
          description="Create your first field to start building your record structure"
          action={{ label: "Add Field", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <Card key={field.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                    {field.sensitive && (
                      <Badge variant="destructive" className="text-xs">Sensitive</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {field.type.replace("_", " ")}
                  </span>
                </div>

                <Dropdown
                  trigger={
                    <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownItem onClick={() => openEdit(field)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownItem>
                  <DropdownItem onClick={() => handleDelete(field)} destructive>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownItem>
                </Dropdown>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingField ? "Edit Field" : "Add Field"}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label required>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Full Name, Passport Number"
            />
          </div>

          <div className="space-y-2">
            <Label required>Type</Label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
              options={fieldTypeOptions}
            />
          </div>

          {/* Type-specific options */}
          {["select", "multi_select"].includes(type) && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={opt.label} readOnly className="flex-1" />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    placeholder="Add an option"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption())}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {type === "file" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Allow multiple files</Label>
                <Switch checked={multiple} onChange={setMultiple} />
              </div>
              <div className="space-y-2">
                <Label>Max file size (MB)</Label>
                <Input
                  type="number"
                  value={maxSizeMb}
                  onChange={(e) => setMaxSizeMb(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
            </div>
          )}

          {type === "currency" && (
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "USD", label: "USD ($)" },
                  { value: "EUR", label: "EUR" },
                  { value: "GBP", label: "GBP" },
                  { value: "AED", label: "AED" },
                  { value: "SAR", label: "SAR" },
                  { value: "QAR", label: "QAR" },
                  { value: "INR", label: "INR" },
                  { value: "LKR", label: "LKR" },
                ]}
              />
            </div>
          )}

          {type === "date" && (
            <div className="flex items-center justify-between">
              <Label>Include time</Label>
              <Switch checked={includeTime} onChange={setIncludeTime} />
            </div>
          )}

          {["text", "textarea"].includes(type) && (
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="Placeholder text"
              />
            </div>
          )}

          {/* Common settings */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Required</Label>
                <p className="text-xs text-muted-foreground">Must be filled when creating a record</p>
              </div>
              <Switch checked={required} onChange={setRequired} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Sensitive</Label>
                <p className="text-xs text-muted-foreground">Excluded from exports, access is logged</p>
              </div>
              <Switch checked={sensitive} onChange={setSensitive} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Filterable</Label>
                <p className="text-xs text-muted-foreground">Available in the filter builder</p>
              </div>
              <Switch checked={filterable} onChange={setFilterable} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show in table</Label>
                <p className="text-xs text-muted-foreground">Visible as a column in the records table</p>
              </div>
              <Switch checked={showInTable} onChange={setShowInTable} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingField ? "Save Changes" : "Create Field"}
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
