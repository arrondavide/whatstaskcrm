import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { records, recordLinks, recordComments, activity } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";

const mergeSchema = z.object({
  primaryId: z.string().uuid(),   // Keep this record
  secondaryId: z.string().uuid(), // Merge into primary, then soft-delete
  mergedData: z.record(z.string(), z.unknown()), // The final merged data
});

// POST /api/records/merge — Merge two records
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = mergeSchema.parse(await request.json());

  const [primary, secondary] = await Promise.all([
    db.query.records.findFirst({
      where: and(eq(records.id, body.primaryId), eq(records.tenantId, auth.tenantId)),
    }),
    db.query.records.findFirst({
      where: and(eq(records.id, body.secondaryId), eq(records.tenantId, auth.tenantId)),
    }),
  ]);

  if (!primary || !secondary) {
    throw new AppError(ErrorCodes.NOT_FOUND, "One or both records not found", 404);
  }

  // Update primary record with merged data
  const [updated] = await db
    .update(records)
    .set({
      data: body.mergedData,
      tags: [...new Set([...(primary.tags ?? []), ...(secondary.tags ?? [])])],
      version: (primary.version ?? 1) + 1,
      updatedBy: auth.authUid,
      updatedAt: new Date(),
    })
    .where(eq(records.id, body.primaryId))
    .returning();

  // Move secondary's links to primary
  await db
    .update(recordLinks)
    .set({ sourceRecordId: body.primaryId })
    .where(eq(recordLinks.sourceRecordId, body.secondaryId));
  await db
    .update(recordLinks)
    .set({ targetRecordId: body.primaryId })
    .where(eq(recordLinks.targetRecordId, body.secondaryId));

  // Move secondary's comments to primary
  await db
    .update(recordComments)
    .set({ recordId: body.primaryId })
    .where(eq(recordComments.recordId, body.secondaryId));

  // Soft-delete secondary
  await db
    .update(records)
    .set({ deleted: true, deletedAt: new Date(), deletedBy: auth.authUid })
    .where(eq(records.id, body.secondaryId));

  // Audit log
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "record.merged",
    entityType: "record",
    entityId: body.primaryId,
    entityName: `Merged ${body.secondaryId} into ${body.primaryId}`,
  });

  return success(updated);
});
