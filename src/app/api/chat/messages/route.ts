import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/chat/messages?roomId=xxx
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
  });

  return success(messages);
});
