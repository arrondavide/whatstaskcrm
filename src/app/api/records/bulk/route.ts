import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { records, activity } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { bulkDeleteSchema } from "@/validators/record";

// POST /api/records/bulk — Bulk delete records
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await request.json();
  const { ids } = bulkDeleteSchema.parse(body);

  // Soft-delete all matching records
  await db
    .update(records)
    .set({
      deleted: true,
      deletedAt: new Date(),
      deletedBy: auth.authUid,
    })
    .where(
      and(
        eq(records.tenantId, auth.tenantId),
        inArray(records.id, ids),
        eq(records.deleted, false)
      )
    );

  // Audit log
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "record.bulk_deleted",
    entityType: "record",
    entityName: `${ids.length} records`,
    changes: { ids } as unknown as Record<string, { old: unknown; new: unknown }>,
  });

  return success({ deleted: ids.length });
});
