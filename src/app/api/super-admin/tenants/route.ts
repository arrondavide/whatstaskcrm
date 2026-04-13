import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { createServerClient } from "@supabase/ssr";

// Super admin only — hardcode your admin email
const SUPER_ADMIN_EMAILS = [process.env.SUPER_ADMIN_EMAIL ?? ""];

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Auth check
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
    throw new AppError(ErrorCodes.FORBIDDEN, "Super admin access required", 403);
  }

  const allTenants = await db.query.tenants.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return success(allTenants);
});
