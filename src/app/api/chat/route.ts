import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { chatRooms, chatMessages } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const createMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const createRoomSchema = z.object({
  type: z.enum(["team", "direct"]),
  name: z.string().optional(),
  participants: z.array(z.string()),
});

// GET /api/chat — List chat rooms
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const rooms = await db.query.chatRooms.findMany({
    where: eq(chatRooms.tenantId, auth.tenantId),
    orderBy: (r, { desc }) => [desc(r.lastMessageAt)],
  });

  return success(rooms);
});

// POST /api/chat — Send a message or create a room
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await request.json();

  // Create room
  if (body.type) {
    const parsed = createRoomSchema.parse(body);
    const [room] = await db
      .insert(chatRooms)
      .values({
        tenantId: auth.tenantId,
        type: parsed.type,
        name: parsed.name,
        participants: [...parsed.participants, auth.authUid],
      })
      .returning();
    return success(room, 201);
  }

  // Send message
  const parsed = createMessageSchema.parse(body);
  const [message] = await db
    .insert(chatMessages)
    .values({
      roomId: parsed.roomId,
      tenantId: auth.tenantId,
      senderId: auth.authUid,
      senderName: auth.user.name,
      content: parsed.content,
    })
    .returning();

  // Update room last message
  await db
    .update(chatRooms)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatRooms.id, parsed.roomId));

  return success(message, 201);
});
