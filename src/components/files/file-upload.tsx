"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image, Film } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatFileSize } from "@/utils/format";

interface FileUploadProps {
  value: string | string[] | null;
  onChange: (value: unknown) => void;
  accept?: string[];
  multiple?: boolean;
  maxSizeMb?: number;
  readOnly?: boolean;
}

interface LocalFile {
  file: File;
  preview?: string;
}

export function FileUpload({
  value,
  onChange,
  accept,
  multiple,
  maxSizeMb = 10,
  readOnly,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (readOnly) return;

      // For now, store file names as placeholder
      // In production, files get uploaded to Firebase Storage
      const fileUrls = acceptedFiles.map((f) => f.name);

      if (multiple) {
        const existing = Array.isArray(value) ? value : [];
        onChange([...existing, ...fileUrls]);
      } else {
        onChange(fileUrls[0] || null);
      }
    },
    [onChange, multiple, value, readOnly]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: multiple ?? false,
    maxSize: maxSizeMb * 1024 * 1024,
    disabled: readOnly,
    accept: accept
      ? accept.reduce(
          (acc, type) => {
            if (type.startsWith(".")) {
              acc[`application/${type.slice(1)}`] = [type];
            } else {
              acc[type] = [];
            }
            return acc;
          },
          {} as Record<string, string[]>
        )
      : undefined,
  });

  const files = Array.isArray(value) ? value : value ? [value] : [];

  function removeFile(index: number) {
    if (readOnly) return;
    if (multiple) {
      const newFiles = files.filter((_, i) => i !== index);
      onChange(newFiles.length > 0 ? newFiles : null);
    } else {
      onChange(null);
    }
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
      return <Image className="h-4 w-4" />;
    }
    if (["mp4", "mov", "avi", "webm"].includes(ext || "")) {
      return <Film className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      {!readOnly && (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-input p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/50",
            isDragActive && "border-primary bg-accent"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop files here"
              : "Drag files here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Max {maxSizeMb} MB per file
          </p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-md border border-input p-2"
            >
              <div className="text-muted-foreground">{getFileIcon(file)}</div>
              <span className="flex-1 truncate text-sm">{file}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
