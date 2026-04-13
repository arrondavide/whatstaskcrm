import { z } from "zod";

export const onboardingSchema = z.object({
  companyName: z.string().min(2).max(100),
  userName: z.string().min(2).max(100),
  recordLabel: z.string().min(1).max(50).optional(),
  recordLabelSingular: z.string().min(1).max(50).optional(),
});
