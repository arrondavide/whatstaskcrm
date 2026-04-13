import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { fields, activity } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateFieldSchema } from "@/validators/field";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/fields/[id] — Update a field
export const PATCH = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;
  const body = updateFieldSchema.parse(await request.json());

  const existing = await db.query.fields.findFirst({
    where: and(eq(fields.id, id), eq(fields.tenantId, auth.tenantId)),
  });
  if (!existing) throw new AppError(ErrorCodes.NOT_FOUND, "Field not found", 404);

  const [updated] = await db
    .update(fields)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(fields.id, id), eq(fields.tenantId, auth.tenantId)))
    .returning();

  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "field.updated",
    entityType: "field",
    entityId: id,
    entityName: updated.label,
  });

  return success(updated);
});

// DELETE /api/fields/[id] — Delete a field
export const DELETE = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;

  const existing = await db.query.fields.findFirst({
    where: and(eq(fields.id, id), eq(fields.tenantId, auth.tenantId)),
  });
  if (!existing) throw new AppError(ErrorCodes.NOT_FOUND, "Field not found", 404);

  await db
    .delete(fields)
    .where(and(eq(fields.id, id), eq(fields.tenantId, auth.tenantId)));

  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "field.deleted",
    entityType: "field",
    entityId: id,
    entityName: existing.label,
  });

  return success({ deleted: true });
});
