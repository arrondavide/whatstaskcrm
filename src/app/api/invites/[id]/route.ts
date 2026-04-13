import { NextRequest } from "next/server";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";

// GET /api/invites/[id] — Public endpoint to validate an invite
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const invite = await db.query.invites.findFirst({
      where: eq(invites.id, id),
    });

    if (!invite) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Invite not found", 404);
    }

    const expired = new Date(invite.expiresAt) < new Date();

    return success({
      id: invite.id,
      tenantName: invite.tenantName,
      role: invite.role,
      email: invite.email,
      status: expired ? "expired" : invite.status,
      invitedByName: invite.invitedByName,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    return error(err);
  }
}
