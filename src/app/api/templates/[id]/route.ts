import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// GET /api/templates/[id]
export const GET = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;

  const template = await db.query.templates.findFirst({
    where: and(eq(templates.id, id), eq(templates.tenantId, auth.tenantId)),
  });

  if (!template) throw new AppError(ErrorCodes.NOT_FOUND, "Template not found", 404);
  return success(template);
});

// PATCH /api/templates/[id]
export const PATCH = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;
  const body = await request.json();

  const [updated] = await db
    .update(templates)
    .set({
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.blocks && { blocks: body.blocks }),
      ...(body.styles && { styles: body.styles }),
      updatedAt: new Date(),
    })
    .where(and(eq(templates.id, id), eq(templates.tenantId, auth.tenantId)))
    .returning();

  return success(updated);
});

// DELETE /api/templates/[id]
export const DELETE = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;

  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.tenantId, auth.tenantId)));
  return success({ deleted: true });
});
