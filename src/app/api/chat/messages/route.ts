import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/chat/messages?roomId=xxx — Get messages for a room
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const roomId = new URL(request.url).searchParams.get("roomId");
  if (!roomId) return success([]);

  const messages = await db.query.chatMessages.findMany({
    where: and(
      eq(chatMessages.roomId, roomId),
      eq(chatMessages.tenantId, auth.tenantId),
      eq(chatMessages.deleted, false)
    ),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    limit: 200,
  });

  // Mark all messages in this room as read by current user
  await db.execute(
    sql`UPDATE chat_messages
        SET read_by = array_append(read_by, ${auth.user.id})
        WHERE room_id = ${roomId}
          AND tenant_id = ${auth.tenantId}
          AND NOT (read_by @> ARRAY[${auth.user.id}]::text[])`
  );

  return success(messages);
});

// PATCH /api/chat/messages — Edit or delete a message
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await request.json();
  const { messageId, content, deleted } = body;

  if (!messageId) return success(null);

  // Only sender can edit/delete their own message
  const msg = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });

  if (!msg) return success(null);
  if (msg.senderId !== auth.user.id && auth.user.role !== "admin") {
    return success(null); // silently ignore
  }

  const updates: Record<string, unknown> = {};
  if (content !== undefined) {
    updates.content = content;
    updates.edited = true;
  }
  if (deleted !== undefined) {
    updates.deleted = deleted;
  }

  const [updated] = await db
    .update(chatMessages)
    .set(updates)
    .where(eq(chatMessages.id, messageId))
    .returning();

  return success(updated);
});
