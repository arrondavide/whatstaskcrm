import { NextRequest } from "next/server";
import { withAuth, withValidation, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { tenants, activity } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateTenantSchema } from "@/validators/tenant";

// GET /api/tenants — Get current tenant
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, auth.tenantId),
  });
  return success(tenant);
});

// PATCH /api/tenants — Update tenant settings
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await withValidation(request, updateTenantSchema);

  const [updated] = await db
    .update(tenants)
    .set(body)
    .where(eq(tenants.id, auth.tenantId))
    .returning();

  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "tenant.updated",
    entityType: "tenant",
    entityId: auth.tenantId,
    changes: body as Record<string, { old: unknown; new: unknown }>,
  });

  return success(updated);
});
