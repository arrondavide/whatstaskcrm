import { z } from "zod";

export const fieldSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  type: z.enum([
    "text", "textarea", "number", "phone", "email",
    "date", "select", "multi_select", "file", "url",
    "currency", "boolean",
  ]),
  required: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  filterable: z.boolean().default(true),
  searchable: z.boolean().default(true),
  show_in_table: z.boolean().default(true),
  config: z.object({
    options: z.array(z.object({
      label: z.string(),
      color: z.string().optional(),
    })).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    precision: z.number().optional(),
    currency: z.string().optional(),
    accept: z.array(z.string()).optional(),
    multiple: z.boolean().optional(),
    max_size_mb: z.number().optional(),
    max_length: z.number().optional(),
    placeholder: z.string().optional(),
    include_time: z.boolean().optional(),
    open_in_new_tab: z.boolean().optional(),
  }).default({}),
});

export type FieldInput = z.infer<typeof fieldSchema>;
