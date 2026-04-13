import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const pipelineSchema = z.object({
  enabled: z.boolean(),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    order: z.number(),
  })),
});

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = pipelineSchema.parse(await request.json());

  const [updated] = await db
    .update(tenants)
    .set({ pipelineConfig: body })
    .where(eq(tenants.id, auth.tenantId))
    .returning();

  return success(updated);
});
