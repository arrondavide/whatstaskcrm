"use client";

import { type Field } from "@/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/files/file-upload";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";

interface DynamicFieldProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  readOnly?: boolean;
}

export function DynamicField({ field, value, onChange, error, readOnly }: DynamicFieldProps) {
  switch (field.type) {
    case "text":
    case "phone":
    case "email":
    case "url":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <Input
            type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.config.placeholder || `Enter ${field.label.toLowerCase()}`}
            maxLength={field.config.max_length}
            readOnly={readOnly}
            error={error}
          />
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.config.placeholder || `Enter ${field.label.toLowerCase()}`}
            maxLength={field.config.max_length}
            readOnly={readOnly}
            error={error}
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <Input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            min={field.config.min}
            max={field.config.max}
            step={field.config.precision ? Math.pow(10, -field.config.precision) : 1}
            readOnly={readOnly}
            error={error}
          />
        </div>
      );

    case "currency":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <div className="flex gap-2">
            <span className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
              {field.config.currency || "USD"}
            </span>
            <Input
              type="number"
              value={value !== undefined && value !== null ? String(value) : ""}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              min={0}
              step={0.01}
              readOnly={readOnly}
              error={error}
            />
          </div>
        </div>
      );

    case "date":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <Input
            type={field.config.include_time ? "datetime-local" : "date"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            error={error}
          />
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <Select
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            options={(field.config.options || []).map((opt) => ({
              value: opt.label,
              label: opt.label,
            }))}
            placeholder={`Select ${field.label.toLowerCase()}`}
            disabled={readOnly}
            error={error}
          />
        </div>
      );

    case "multi_select":
      return (
        <MultiSelectField
          field={field}
          value={(value as string[]) || []}
          onChange={onChange}
          readOnly={readOnly}
          error={error}
        />
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between rounded-md border border-input p-3">
          <Label>{field.label}</Label>
          <Switch
            checked={(value as boolean) || false}
            onChange={onChange}
            disabled={readOnly}
          />
        </div>
      );

    case "file":
      return (
        <div className="space-y-2">
          <Label required={field.required}>{field.label}</Label>
          <FileUpload
            value={value as string | string[] | null}
            onChange={onChange}
            accept={field.config.accept}
            multiple={field.config.multiple}
            maxSizeMb={field.config.max_size_mb}
            readOnly={readOnly}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            error={error}
          />
        </div>
      );
  }
}

function MultiSelectField({
  field,
  value,
  onChange,
  readOnly,
  error,
}: {
  field: Field;
  value: string[];
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const options = field.config.options || [];

  function toggleOption(option: string) {
    if (readOnly) return;
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  }

  return (
    <div className="space-y-2">
      <Label required={field.required}>{field.label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !readOnly && setIsOpen(!isOpen)}
          className="flex min-h-[40px] w-full flex-wrap gap-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          {value.length === 0 && (
            <span className="text-muted-foreground">
              Select {field.label.toLowerCase()}
            </span>
          )}
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              {!readOnly && (
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(v);
                  }}
                />
              )}
            </Badge>
          ))}
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => toggleOption(opt.label)}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    value.includes(opt.label)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {value.includes(opt.label) && (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
