import { z } from "zod";

export const createRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  pipelineStage: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  pipelineStage: z.string().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});
