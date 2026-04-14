import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";

// GET /api/auth/workspaces — List all workspaces the user belongs to
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Not authenticated", 401);
    }

    // Find all user rows for this auth UID (one per workspace)
    const userRows = await db.query.users.findMany({
      where: eq(users.authUid, authUser.id),
    });

    // Get tenant details for each
    const workspaces = await Promise.all(
      userRows.map(async (u) => {
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, u.tenantId),
        });
        return {
          tenantId: u.tenantId,
          tenantName: tenant?.name ?? "Unknown",
          role: u.role,
          userId: u.id,
        };
      })
    );

    return success(workspaces);
  } catch (err) {
    return error(err);
  }
}
