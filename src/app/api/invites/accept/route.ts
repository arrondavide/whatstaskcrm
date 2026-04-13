import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/db";
import { invites, users, tenants, activity } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { success, error } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { z } from "zod";

const acceptSchema = z.object({
  inviteId: z.string().uuid(),
  userName: z.string().min(2).max(100),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { inviteId, userName } = acceptSchema.parse(body);

    // Fetch invite
    const invite = await db.query.invites.findFirst({
      where: eq(invites.id, inviteId),
    });

    if (!invite) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Invite not found", 404);
    }
    if (invite.status === "accepted") {
      throw new AppError(ErrorCodes.DUPLICATE_ENTRY, "Invite already accepted", 400);
    }
    if (invite.status === "expired" || new Date(invite.expiresAt) < new Date()) {
      throw new AppError(ErrorCodes.INVITE_EXPIRED, "Invite has expired", 410);
    }

    // Check user doesn't already exist in this tenant
    const existingUser = await db.query.users.findFirst({
      where: eq(users.authUid, authUser.id),
    });
    if (existingUser) {
      throw new AppError(ErrorCodes.DUPLICATE_ENTRY, "You already belong to a workspace", 400);
    }

    // Create user with invite's role
    const rolePerms = ROLE_PERMISSIONS[invite.role as keyof typeof ROLE_PERMISSIONS] ?? ROLE_PERMISSIONS.employee;

    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: invite.tenantId,
        authUid: authUser.id,
        email: authUser.email!,
        name: userName,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
        role: invite.role,
        status: "active",
        permissions: rolePerms,
      })
      .returning();

    // Update invite status
    await db
      .update(invites)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedBy: authUser.id,
      })
      .where(eq(invites.id, inviteId));

    // Audit log
    await db.insert(activity).values({
      tenantId: invite.tenantId,
      userId: authUser.id,
      userName,
      userRole: invite.role,
      action: "invite.accepted",
      entityType: "invite",
      entityId: inviteId,
      entityName: authUser.email!,
    });

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, invite.tenantId),
    });

    return success({ user: newUser, tenant }, 201);
  } catch (err) {
    return error(err);
  }
}
