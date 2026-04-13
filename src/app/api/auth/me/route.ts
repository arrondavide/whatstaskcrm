import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, error } from "@/lib/api/response";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const auth = await withAuth(request);

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, auth.tenantId),
    });

    return success({
      user: auth.user,
      tenant,
    });
  } catch (err) {
    return error(err);
  }
}
