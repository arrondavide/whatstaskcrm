import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { recordRevisions, records } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/records/revisions?recordId=xxx
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const recordId = new URL(request.url).searchParams.get("recordId");
  if (!recordId) return success([]);

  const revisions = await db.query.recordRevisions.findMany({
    where: and(
      eq(recordRevisions.recordId, recordId),
      eq(recordRevisions.tenantId, auth.tenantId)
    ),
    orderBy: (r, { desc }) => [desc(r.version)],
  });

  return success(revisions);
});

// POST /api/records/revisions — restore a specific version
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { recordId, version } = await request.json();

  const revision = await db.query.recordRevisions.findFirst({
    where: and(
      eq(recordRevisions.recordId, recordId),
      eq(recordRevisions.version, version),
      eq(recordRevisions.tenantId, auth.tenantId)
    ),
  });

  if (!revision) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Revision not found", 404);
  }

  // Get current record to save as new revision before restoring
  const current = await db.query.records.findFirst({
    where: and(eq(records.id, recordId), eq(records.tenantId, auth.tenantId)),
  });

  if (!current) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Record not found", 404);
  }

  const newVersion = (current.version ?? 1) + 1;

  // Save current state as revision
  await db.insert(recordRevisions).values({
    tenantId: auth.tenantId,
    recordId,
    version: current.version ?? 1,
    data: current.data as Record<string, unknown>,
    changes: { _restored: { old: `v${current.version}`, new: `v${version}` } } as Record<string, { old: unknown; new: unknown }>,
    changedBy: auth.authUid,
    changedByName: auth.user.name,
  });

  // Restore the old version's data
  const [updated] = await db
    .update(records)
    .set({
      data: revision.data,
      version: newVersion,
      updatedBy: auth.authUid,
      updatedAt: new Date(),
    })
    .where(and(eq(records.id, recordId), eq(records.tenantId, auth.tenantId)))
    .returning();

  return success(updated);
});
