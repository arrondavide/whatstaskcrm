import { z } from "zod";

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  recordLabel: z.string().min(1).max(50).optional(),
  recordLabelSingular: z.string().min(1).max(50).optional(),
  documentLabel: z.string().min(1).max(50).optional(),
});
