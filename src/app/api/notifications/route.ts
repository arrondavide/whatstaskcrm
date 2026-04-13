import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// GET /api/notifications
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const conditions = [eq(notifications.userId, auth.authUid)];
  if (unreadOnly) conditions.push(eq(notifications.read, false));

  const items = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });

  const unreadCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, auth.authUid), eq(notifications.read, false)));

  return success({ items, unreadCount: Number(unreadCount[0].count) });
});

// PATCH /api/notifications — mark all as read
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, auth.authUid), eq(notifications.read, false)));

  return success({ marked: true });
});
