import { NextRequest } from "next/server";
import { withAuth, withValidation, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { records, activity, recordRevisions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateRecordSchema } from "@/validators/record";

type Params = { params: Promise<{ id: string }> };

// GET /api/records/[id]
export const GET = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;

  const record = await db.query.records.findFirst({
    where: and(eq(records.id, id), eq(records.tenantId, auth.tenantId)),
  });

  if (!record || record.deleted) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Record not found", 404);
  }

  return success(record);
});

// PATCH /api/records/[id]
export const PATCH = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;
  const body = await withValidation(request, updateRecordSchema);

  const existing = await db.query.records.findFirst({
    where: and(eq(records.id, id), eq(records.tenantId, auth.tenantId)),
  });

  if (!existing || existing.deleted) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Record not found", 404);
  }

  // Save current state as revision before updating
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (body.data) {
    const oldData = existing.data as Record<string, unknown>;
    for (const [key, newVal] of Object.entries(body.data)) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldData[key], new: newVal };
      }
    }
  }

  await db.insert(recordRevisions).values({
    tenantId: auth.tenantId,
    recordId: id,
    version: existing.version ?? 1,
    data: existing.data as Record<string, unknown>,
    changes: Object.keys(changes).length > 0 ? changes : null,
    changedBy: auth.authUid,
    changedByName: auth.user.name,
  });

  const [updated] = await db
    .update(records)
    .set({
      ...(body.data && { data: body.data }),
      ...(body.pipelineStage !== undefined && { pipelineStage: body.pipelineStage }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
      ...(body.tags && { tags: body.tags }),
      updatedBy: auth.authUid,
      updatedAt: new Date(),
      version: (existing.version ?? 1) + 1,
    })
    .where(and(eq(records.id, id), eq(records.tenantId, auth.tenantId)))
    .returning();

  // Audit log
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "record.updated",
    entityType: "record",
    entityId: id,
    changes: body as Record<string, { old: unknown; new: unknown }>,
  });

  return success(updated);
});

// DELETE /api/records/[id] — soft delete
export const DELETE = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;

  const existing = await db.query.records.findFirst({
    where: and(eq(records.id, id), eq(records.tenantId, auth.tenantId)),
  });

  if (!existing) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Record not found", 404);
  }

  await db
    .update(records)
    .set({
      deleted: true,
      deletedAt: new Date(),
      deletedBy: auth.authUid,
    })
    .where(and(eq(records.id, id), eq(records.tenantId, auth.tenantId)));

  // Audit log
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "record.deleted",
    entityType: "record",
    entityId: id,
    entityName: JSON.stringify(existing.data),
  });

  return success({ deleted: true });
});
