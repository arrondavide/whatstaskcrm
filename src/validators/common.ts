import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const sortSchema = z.object({
  fieldId: z.string(),
  direction: z.enum(["asc", "desc"]),
});

export const filterSchema = z.object({
  fieldId: z.string(),
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "starts_with", "ends_with", "gt", "gte", "lt", "lte",
    "is_empty", "is_not_empty", "in", "not_in",
  ]),
  value: z.unknown(),
});

export const filterGroupSchema = z.object({
  match: z.enum(["all", "any"]).default("all"),
  filters: z.array(filterSchema).default([]),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
});
