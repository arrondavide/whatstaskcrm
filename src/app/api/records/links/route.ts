import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { recordLinks, records } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { z } from "zod";

const createLinkSchema = z.object({
  sourceRecordId: z.string().uuid(),
  targetRecordId: z.string().uuid(),
  linkType: z.enum(["related", "parent", "child"]).default("related"),
});

// GET /api/records/links?recordId=xxx
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const recordId = new URL(request.url).searchParams.get("recordId");
  if (!recordId) return success([]);

  const links = await db.query.recordLinks.findMany({
    where: and(
      eq(recordLinks.tenantId, auth.tenantId),
      or(
        eq(recordLinks.sourceRecordId, recordId),
        eq(recordLinks.targetRecordId, recordId)
      )
    ),
  });

  // Resolve linked record data
  const linkedRecords = await Promise.all(
    links.map(async (link) => {
      const linkedId = link.sourceRecordId === recordId ? link.targetRecordId : link.sourceRecordId;
      const record = await db.query.records.findFirst({
        where: and(eq(records.id, linkedId), eq(records.tenantId, auth.tenantId)),
      });
      return {
        linkId: link.id,
        linkType: link.linkType,
        record: record ? { id: record.id, data: record.data, createdAt: record.createdAt } : null,
      };
    })
  );

  return success(linkedRecords.filter((r) => r.record !== null));
});

// POST /api/records/links
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = createLinkSchema.parse(await request.json());

  const [link] = await db
    .insert(recordLinks)
    .values({
      tenantId: auth.tenantId,
      sourceRecordId: body.sourceRecordId,
      targetRecordId: body.targetRecordId,
      linkType: body.linkType,
      createdBy: auth.authUid,
    })
    .returning();

  return success(link, 201);
});

// DELETE /api/records/links
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { linkId } = await request.json();

  await db
    .delete(recordLinks)
    .where(and(eq(recordLinks.id, linkId), eq(recordLinks.tenantId, auth.tenantId)));

  return success({ deleted: true });
});
