import { NextRequest } from "next/server";
import { withAuth, withValidation, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { invites, activity, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createInviteSchema } from "@/validators/invite";
import { sendInviteEmail } from "@/lib/email";

// GET /api/invites — List pending invites
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const result = await db.query.invites.findMany({
    where: and(
      eq(invites.tenantId, auth.tenantId),
      eq(invites.status, "pending")
    ),
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  return success(result);
});

// POST /api/invites — Create a new invite
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await withValidation(request, createInviteSchema);

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, auth.tenantId),
  });

  const [invite] = await db
    .insert(invites)
    .values({
      tenantId: auth.tenantId,
      tenantName: tenant?.name ?? "Unknown",
      email: body.email,
      role: body.role,
      invitedBy: auth.authUid,
      invitedByName: auth.user.name,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "invite.created",
    entityType: "invite",
    entityId: invite.id,
    entityName: body.email,
  });

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteLink = `${appUrl}/invite/${invite.id}`;
  await sendInviteEmail({
    to: body.email,
    inviterName: auth.user.name,
    tenantName: tenant?.name ?? "your workspace",
    role: body.role,
    inviteLink,
  });

  return success(invite, 201);
});
