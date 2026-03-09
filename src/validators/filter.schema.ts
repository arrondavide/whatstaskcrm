import { z } from "zod";

export const filterSchema = z.object({
  id: z.string(),
  field_id: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

export const filterGroupSchema = z.object({
  match: z.enum(["all", "any"]),
  filters: z.array(filterSchema),
});

export const savedViewSchema = z.object({
  name: z.string().min(1, "View name is required").max(50),
  filters: filterGroupSchema,
  sort: z.array(z.object({
    field_id: z.string(),
    direction: z.enum(["asc", "desc"]),
  })),
  columns: z.array(z.object({
    field_id: z.string(),
    width: z.number().optional(),
  })),
  shared: z.boolean().default(false),
  pinned: z.boolean().default(false),
});

export type FilterInput = z.infer<typeof filterSchema>;
export type FilterGroupInput = z.infer<typeof filterGroupSchema>;
export type SavedViewInput = z.infer<typeof savedViewSchema>;
