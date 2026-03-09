import { z } from "zod";

// Records use dynamic fields, so we validate against the tenant's field schema at runtime
export const recordDataSchema = z.record(z.string(), z.unknown());

export const createRecordSchema = z.object({
  data: recordDataSchema,
  pipeline_stage: z.string().optional(),
});

export const updateRecordSchema = z.object({
  data: recordDataSchema,
  pipeline_stage: z.string().optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
