"use client";

import { useState } from "react";
import { useTenantStore } from "@/stores/tenant-store";
import { DynamicField } from "./dynamic-field";
import { Button } from "@/components/ui/button";
import type { Field } from "@/types";

interface RecordFormProps {
  initialData?: { [field_id: string]: unknown };
  onSubmit: (data: { [field_id: string]: unknown }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function RecordForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: RecordFormProps) {
  const { fields } = useTenantStore();
  const [data, setData] = useState<{ [key: string]: unknown }>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  function handleFieldChange(fieldId: string, value: unknown) {
    setData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user modifies the field
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: { [key: string]: string } = {};

    fields.forEach((field) => {
      if (field.required) {
        const val = data[field.id];
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <DynamicField
          key={field.id}
          field={field}
          value={data[field.id]}
          onChange={(value) => handleFieldChange(field.id, value)}
          error={errors[field.id]}
        />
      ))}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
