import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { chatRooms, chatMessages, notifications, users } from "@/db/schema";
import { eq, and, desc, sql, arrayContains } from "drizzle-orm";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["team", "direct", "record"]).default("team"),
  participants: z.array(z.string()).default([]), // user IDs
  isPublic: z.boolean().default(false),
});

const sendMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const addParticipantsSchema = z.object({
  roomId: z.string().uuid(),
  userIds: z.array(z.string()),
});

// GET /api/chat — List chat rooms the user can see
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  // Get all rooms in tenant — user sees rooms they're in OR public rooms
  const allRooms = await db.query.chatRooms.findMany({
    where: eq(chatRooms.tenantId, auth.tenantId),
    orderBy: (r, { desc }) => [desc(r.lastMessageAt), desc(r.createdAt)],
  });

  const visibleRooms = allRooms.filter((room) => {
    if (room.isPublic) return true;
    if (room.participants?.includes(auth.user.id)) return true;
    if (auth.user.role === "admin") return true; // admins see all
    return false;
  });

  // Get unread counts per room
  const roomsWithMeta = await Promise.all(
    visibleRooms.map(async (room) => {
      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.roomId, room.id),
            eq(chatMessages.deleted, false),
            sql`NOT (${chatMessages.readBy} @> ARRAY[${auth.user.id}]::text[])`
          )
        );

      // Get last message
      const lastMsg = await db.query.chatMessages.findFirst({
        where: and(eq(chatMessages.roomId, room.id), eq(chatMessages.deleted, false)),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });

      return {
        ...room,
        unreadCount: Number(unreadResult.count),
        lastMessage: lastMsg
          ? { content: lastMsg.content, senderName: lastMsg.senderName, createdAt: lastMsg.createdAt }
          : null,
      };
    })
  );

  return success(roomsWithMeta);
});

// POST /api/chat — Create room, send message, or manage participants
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await request.json();

  // ── Create Room (admin only) ──
  if (body.name && !body.roomId) {
    if (auth.user.role !== "admin") {
      throw new AppError(ErrorCodes.FORBIDDEN, "Only admins can create chat groups", 403);
    }

    const parsed = createRoomSchema.parse(body);

    // Always include creator as participant
    const participantIds = [...new Set([auth.user.id, ...parsed.participants])];

    const [room] = await db
      .insert(chatRooms)
      .values({
        tenantId: auth.tenantId,
        type: parsed.type,
        name: parsed.name,
        participants: participantIds,
        isPublic: parsed.isPublic,
        createdBy: auth.user.id,
      })
      .returning();

    // Notify added participants
    const otherParticipants = participantIds.filter((id) => id !== auth.user.id);
    if (otherParticipants.length > 0) {
      await db.insert(notifications).values(
        otherParticipants.map((userId) => ({
          tenantId: auth.tenantId,
          userId,
          type: "chat_added",
          title: `Added to #${parsed.name}`,
          body: `${auth.user.name} added you to a chat group`,
          link: `/chat`,
          actorId: auth.user.id,
          actorName: auth.user.name,
        }))
      );
    }

    return success(room, 201);
  }

  // ── Add Participants (admin only) ──
  if (body.userIds && body.roomId) {
    if (auth.user.role !== "admin") {
      throw new AppError(ErrorCodes.FORBIDDEN, "Only admins can manage participants", 403);
    }

    const parsed = addParticipantsSchema.parse(body);

    const room = await db.query.chatRooms.findFirst({
      where: and(eq(chatRooms.id, parsed.roomId), eq(chatRooms.tenantId, auth.tenantId)),
    });
    if (!room) throw new AppError(ErrorCodes.NOT_FOUND, "Room not found", 404);

    const existingParticipants = room.participants ?? [];
    const newParticipants = [...new Set([...existingParticipants, ...parsed.userIds])];

    const [updated] = await db
      .update(chatRooms)
      .set({ participants: newParticipants })
      .where(eq(chatRooms.id, parsed.roomId))
      .returning();

    // Notify newly added participants
    const addedIds = parsed.userIds.filter((id) => !existingParticipants.includes(id));
    if (addedIds.length > 0) {
      await db.insert(notifications).values(
        addedIds.map((userId) => ({
          tenantId: auth.tenantId,
          userId,
          type: "chat_added",
          title: `Added to #${room.name ?? "chat"}`,
          body: `${auth.user.name} added you to a chat group`,
          link: `/chat`,
          actorId: auth.user.id,
          actorName: auth.user.name,
        }))
      );
    }

    return success(updated);
  }

  // ── Send Message ──
  const parsed = sendMessageSchema.parse(body);

  // Verify room exists and user has access
  const room = await db.query.chatRooms.findFirst({
    where: and(eq(chatRooms.id, parsed.roomId), eq(chatRooms.tenantId, auth.tenantId)),
  });
  if (!room) throw new AppError(ErrorCodes.NOT_FOUND, "Room not found", 404);

  if (!room.isPublic && !room.participants?.includes(auth.user.id) && auth.user.role !== "admin") {
    throw new AppError(ErrorCodes.FORBIDDEN, "You don't have access to this room", 403);
  }

  const [message] = await db
    .insert(chatMessages)
    .values({
      roomId: parsed.roomId,
      tenantId: auth.tenantId,
      senderId: auth.user.id,
      senderName: auth.user.name,
      content: parsed.content,
      readBy: [auth.user.id], // sender has read it
    })
    .returning();

  // Update room last message timestamp
  await db
    .update(chatRooms)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatRooms.id, parsed.roomId));

  // Create notifications for all other participants
  const recipientIds = (room.participants ?? []).filter((id) => id !== auth.user.id);
  if (recipientIds.length > 0) {
    await db.insert(notifications).values(
      recipientIds.map((userId) => ({
        tenantId: auth.tenantId,
        userId,
        type: "chat_message",
        title: `New message in #${room.name ?? "chat"}`,
        body: `${auth.user.name}: ${parsed.content.slice(0, 100)}`,
        link: `/chat`,
        actorId: auth.user.id,
        actorName: auth.user.name,
      }))
    );
  }

  return success(message, 201);
});
