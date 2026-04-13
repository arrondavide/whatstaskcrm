import { z } from "zod";

export const fieldTypes = [
  "text", "textarea", "number", "phone", "email", "date",
  "select", "multi_select", "file", "url", "currency", "boolean",
] as const;

export const createFieldSchema = z.object({
  label: z.string().min(1).max(100),
  type: z.enum(fieldTypes),
  required: z.boolean().optional(),
  sensitive: z.boolean().optional(),
  filterable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  showInTable: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateFieldSchema = createFieldSchema.partial();

export const reorderFieldsSchema = z.object({
  fieldIds: z.array(z.string().uuid()),
});
