import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { users, activity } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateUserSchema = z.object({
  role: z.enum(["admin", "manager", "employee", "viewer"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

// PATCH /api/users/[id] — Update user role or status
export const PATCH = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;
  const body = updateUserSchema.parse(await request.json());

  const targetUser = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, auth.tenantId)),
  });

  if (!targetUser) throw new AppError(ErrorCodes.NOT_FOUND, "User not found", 404);

  // Cannot change own role
  if (targetUser.authUid === auth.authUid && body.role) {
    throw new AppError(ErrorCodes.FORBIDDEN, "Cannot change your own role", 403);
  }

  // If changing role, update permissions too
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.role) {
    updates.role = body.role;
    updates.permissions = ROLE_PERMISSIONS[body.role as keyof typeof ROLE_PERMISSIONS] ?? ROLE_PERMISSIONS.employee;
  }
  if (body.status) {
    updates.status = body.status;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(and(eq(users.id, id), eq(users.tenantId, auth.tenantId)))
    .returning();

  // Audit log
  const action = body.role ? "user.role_changed" : body.status === "suspended" ? "user.suspended" : "user.updated";
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action,
    entityType: "user",
    entityId: id,
    entityName: targetUser.name,
    changes: body as Record<string, { old: unknown; new: unknown }>,
  });

  return success(updated);
});

// DELETE /api/users/[id] — Remove user (soft: set to suspended)
export const DELETE = withErrorHandler(async (request: NextRequest, context: unknown) => {
  const auth = await withAuth(request);
  const { id } = await (context as Params).params;

  const targetUser = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, auth.tenantId)),
  });

  if (!targetUser) throw new AppError(ErrorCodes.NOT_FOUND, "User not found", 404);

  // Cannot remove self
  if (targetUser.authUid === auth.authUid) {
    throw new AppError(ErrorCodes.FORBIDDEN, "Cannot remove yourself", 403);
  }

  // Cannot remove last admin
  if (targetUser.role === "admin") {
    const adminCount = await db.query.users.findMany({
      where: and(eq(users.tenantId, auth.tenantId), eq(users.role, "admin"), eq(users.status, "active")),
    });
    if (adminCount.length <= 1) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Cannot remove the last admin", 403);
    }
  }

  await db
    .update(users)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.tenantId, auth.tenantId)));

  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "user.removed",
    entityType: "user",
    entityId: id,
    entityName: targetUser.name,
  });

  return success({ removed: true });
});
