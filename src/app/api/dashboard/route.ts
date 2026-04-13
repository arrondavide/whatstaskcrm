import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { records, users, notifications, activity, chatMessages } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const [recordCount, userCount, unreadNotifs, recentActivity] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(records).where(and(eq(records.tenantId, auth.tenantId), eq(records.deleted, false))),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.tenantId, auth.tenantId)),
    db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, auth.authUid), eq(notifications.read, false))),
    db.select().from(activity).where(eq(activity.tenantId, auth.tenantId)).orderBy(desc(activity.createdAt)).limit(10),
  ]);

  return success({
    stats: {
      totalRecords: Number(recordCount[0].count),
      activeUsers: Number(userCount[0].count),
      unreadNotifications: Number(unreadNotifs[0].count),
    },
    recentActivity,
  });
});
