import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/users — List all users in the tenant
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const result = await db.query.users.findMany({
    where: eq(users.tenantId, auth.tenantId),
    orderBy: (u, { desc }) => [desc(u.createdAt)],
  });

  return success(result);
});
