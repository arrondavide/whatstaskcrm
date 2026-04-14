"use client";

import { useState, useRef } from "react";
import { Upload, X, FileIcon, Plus } from "lucide-react";
import type { FieldItem } from "@/hooks/queries/use-fields";
import toast from "react-hot-toast";

type FieldInputProps = {
  field: FieldItem;
  value: unknown;
  onChange: (value: unknown) => void;
};

type SelectOption = { label: string; value: string; color?: string };

function getOptions(field: FieldItem): SelectOption[] {
  const config = field.config as { options?: SelectOption[] } | null;
  return config?.options ?? [];
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none";

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className={inputClass}
        />
      );

    case "textarea":
      return (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          rows={3}
          className={inputClass}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value !== undefined && value !== null && value !== "" ? Number(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={field.label}
          className={inputClass}
        />
      );

    case "currency":
      return (
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {(field.config as { currency?: string })?.currency ?? "$"}
          </span>
          <input
            type="number"
            step="0.01"
            value={value !== undefined && value !== null && value !== "" ? Number(value) : ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="0.00"
            className={`${inputClass} pl-7`}
          />
        </div>
      );

    case "phone":
      return (
        <input
          type="tel"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className={inputClass}
        />
      );

    case "email":
      return (
        <input
          type="email"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@example.com"
          className={inputClass}
        />
      );

    case "url":
      return (
        <input
          type="url"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className={inputClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );

    case "boolean":
      return (
        <label className="mt-1 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true || value === "true"}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm text-gray-300">{value === true || value === "true" ? "Yes" : "No"}</span>
        </label>
      );

    case "select":
      return <SelectInput field={field} value={value} onChange={onChange} />;

    case "multi_select":
      return <MultiSelectInput field={field} value={value} onChange={onChange} />;

    case "file":
      return <FileInput value={value} onChange={onChange} />;

    case "formula":
      return (
        <div className="mt-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-400 italic">
          Computed field — value calculated automatically
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className={inputClass}
        />
      );
  }
}

// ── Select Dropdown ──────────────────────────────────

function SelectInput({ field, value, onChange }: FieldInputProps) {
  const options = getOptions(field);

  return (
    <select
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
    >
      <option value="">Select {field.label}...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ── Multi Select ──────────────────────────────────────

function MultiSelectInput({ field, value, onChange }: FieldInputProps) {
  const options = getOptions(field);
  const selected: string[] = Array.isArray(value) ? value : [];

  const toggleOption = (optValue: string) => {
    if (selected.includes(optValue)) {
      onChange(selected.filter((v) => v !== optValue));
    } else {
      onChange([...selected, optValue]);
    }
  };

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((v) => {
          const opt = options.find((o) => o.value === v);
          return (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-violet-900/40 px-2.5 py-0.5 text-xs text-violet-300"
            >
              {opt?.label ?? v}
              <button
                type="button"
                onClick={() => toggleOption(v)}
                className="ml-0.5 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options
          .filter((opt) => !selected.includes(opt.value))
          .map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleOption(opt.value)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400 hover:border-violet-500 hover:text-violet-300"
            >
              <Plus size={10} />
              {opt.label}
            </button>
          ))}
      </div>
      {options.length === 0 && (
        <p className="text-xs text-gray-500">No options configured. Edit this field in Settings → Fields.</p>
      )}
    </div>
  );
}

// ── File Upload ──────────────────────────────────────

function FileInput({ value, onChange }: Omit<FieldInputProps, "field">) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // value is an array of { name, url, type, size }
  const files: { name: string; url: string; type: string; size?: number }[] = Array.isArray(value) ? value : value ? [value as { name: string; url: string; type: string }] : [];

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    try {
      const newFiles = [...files];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        // Check size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!data.success) {
          toast.error(data.error?.message ?? `Failed to upload ${file.name}`);
          continue;
        }

        newFiles.push({
          name: file.name,
          url: data.data.url,
          type: file.type,
          size: file.size,
        });
      }

      onChange(newFiles);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-1 space-y-2">
      {/* Existing files */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
            >
              <FileIcon size={14} className="text-gray-500" />
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-violet-400 hover:text-violet-300"
              >
                {f.name}
              </a>
              {f.size && (
                <span className="text-xs text-gray-500">
                  {(f.size / 1024).toFixed(0)}KB
                </span>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-gray-500 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 bg-gray-800/50 px-3 py-3 text-sm text-gray-400 hover:border-violet-500 hover:text-violet-300 disabled:opacity-50"
      >
        <Upload size={16} />
        {uploading ? "Uploading..." : "Upload File"}
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />
    </div>
  );
}

// ── Field Value Display (for table/detail view) ──────

export function FieldValueDisplay({ field, value }: { field: FieldItem; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-600">—</span>;
  }

  switch (field.type) {
    case "boolean":
      return (
        <span className={value === true || value === "true" ? "text-green-400" : "text-gray-500"}>
          {value === true || value === "true" ? "Yes" : "No"}
        </span>
      );

    case "select": {
      const options = getOptions(field);
      const opt = options.find((o) => o.value === String(value));
      return (
        <span className="inline-block rounded-full bg-violet-900/30 px-2 py-0.5 text-xs text-violet-300">
          {opt?.label ?? String(value)}
        </span>
      );
    }

    case "multi_select": {
      const options = getOptions(field);
      const selected: string[] = Array.isArray(value) ? value : [];
      if (selected.length === 0) return <span className="text-gray-600">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span key={v} className="inline-block rounded-full bg-violet-900/30 px-2 py-0.5 text-xs text-violet-300">
                {opt?.label ?? v}
              </span>
            );
          })}
        </div>
      );
    }

    case "email":
      return (
        <a href={`mailto:${value}`} className="text-violet-400 hover:text-violet-300">
          {String(value)}
        </a>
      );

    case "phone":
      return (
        <a href={`tel:${value}`} className="text-violet-400 hover:text-violet-300">
          {String(value)}
        </a>
      );

    case "url":
      return (
        <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 truncate block max-w-[200px]">
          {String(value)}
        </a>
      );

    case "currency": {
      const currency = (field.config as { currency?: string })?.currency ?? "$";
      return <span>{currency}{Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
    }

    case "date": {
      const dateStr = String(value);
      const parsed = new Date(dateStr);
      const display = isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString();
      return <span>{display}</span>;
    }

    case "file": {
      const files: { name: string; url: string }[] = Array.isArray(value) ? value : [];
      if (files.length === 0) return <span className="text-gray-600">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {files.map((f, i) => (
            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              <FileIcon size={12} />
              {f.name}
            </a>
          ))}
        </div>
      );
    }

    default:
      return <span>{String(value)}</span>;
  }
}
