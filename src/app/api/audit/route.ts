import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { activity } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const action = searchParams.get("action");

  const conditions = [eq(activity.tenantId, auth.tenantId)];
  if (action) conditions.push(eq(activity.action, action));

  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(activity)
      .where(where!)
      .orderBy(desc(activity.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(activity)
      .where(where!),
  ]);

  const total = Number(countResult[0].count);

  return success({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});
