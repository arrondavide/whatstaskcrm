import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  content: z.string().optional().default(""),
  fieldMappings: z.record(z.string(), z.string()).optional(),
});

// GET /api/templates
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const result = await db.query.templates.findMany({
    where: eq(templates.tenantId, auth.tenantId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return success(result);
});

// POST /api/templates
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = createTemplateSchema.parse(await request.json());

  const [template] = await db
    .insert(templates)
    .values({
      tenantId: auth.tenantId,
      name: body.name,
      description: body.description,
      content: body.content,
      fieldMappings: body.fieldMappings ?? {},
      createdBy: auth.authUid,
    })
    .returning();

  return success(template, 201);
});
