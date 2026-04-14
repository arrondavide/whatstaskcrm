import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { recordComments, notifications } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { z } from "zod";

const createCommentSchema = z.object({
  recordId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

// GET /api/records/comments?recordId=xxx
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const recordId = new URL(request.url).searchParams.get("recordId");
  if (!recordId) return success([]);

  // Get top-level comments
  const topLevel = await db.query.recordComments.findMany({
    where: and(
      eq(recordComments.recordId, recordId),
      eq(recordComments.tenantId, auth.tenantId),
      eq(recordComments.deleted, false),
      isNull(recordComments.parentId)
    ),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  // Get all replies
  const allReplies = await db.query.recordComments.findMany({
    where: and(
      eq(recordComments.recordId, recordId),
      eq(recordComments.tenantId, auth.tenantId),
      eq(recordComments.deleted, false)
    ),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  // Build threaded structure
  const threaded = topLevel.map((comment) => ({
    ...comment,
    replies: allReplies.filter((r) => r.parentId === comment.id),
  }));

  return success(threaded);
});

// POST /api/records/comments
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = createCommentSchema.parse(await request.json());

  const [comment] = await db
    .insert(recordComments)
    .values({
      tenantId: auth.tenantId,
      recordId: body.recordId,
      parentId: body.parentId ?? null,
      content: body.content,
      authorId: auth.user.id,
      authorName: auth.user.name,
    })
    .returning();

  return success(comment, 201);
});

// PATCH /api/records/comments — edit or delete
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { commentId, content, deleted } = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (content !== undefined) { updates.content = content; updates.edited = true; }
  if (deleted !== undefined) updates.deleted = deleted;

  const [updated] = await db
    .update(recordComments)
    .set(updates)
    .where(and(eq(recordComments.id, commentId), eq(recordComments.tenantId, auth.tenantId)))
    .returning();

  return success(updated);
});
