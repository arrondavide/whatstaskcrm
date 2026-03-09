import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { UserRole } from "@/types/user";

// POST: Create a new invite
export async function POST(req: NextRequest) {
  try {
    const { token, email, role } = await req.json();

    if (!token || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the requester
    const decoded = await adminAuth.verifyIdToken(token);

    // Find the requester's user doc to get tenant_id
    const requesterSnap = await adminDb
      .collectionGroup("users")
      .where("email", "==", decoded.email)
      .limit(1)
      .get();

    if (requesterSnap.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const requesterDoc = requesterSnap.docs[0];
    const requesterData = requesterDoc.data();
    const tenantId = requesterDoc.ref.parent.parent?.id;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check permissions
    if (!requesterData.permissions?.employees?.invite) {
      return NextResponse.json({ error: "No permission to invite" }, { status: 403 });
    }

    // Get tenant info for the email
    const tenantDoc = await adminDb.doc(`tenants/${tenantId}`).get();
    const tenantData = tenantDoc.data();
    const tenantName = tenantData?.branding?.name || "Workspace";

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already a member
    const existingMember = await adminDb
      .collection(`tenants/${tenantId}/users`)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existingMember.empty) {
      return NextResponse.json({ error: "This person is already a member" }, { status: 409 });
    }

    // Check if already invited
    const existingInvite = await adminDb
      .collection("invites")
      .where("email", "==", normalizedEmail)
      .where("tenant_id", "==", tenantId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingInvite.empty) {
      return NextResponse.json({ error: "An invite was already sent to this email" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const inviteRole: UserRole = role || "employee";

    // Create invite document
    const inviteRef = adminDb.collection("invites").doc();
    await inviteRef.set({
      tenant_id: tenantId,
      tenant_name: tenantName,
      email: normalizedEmail,
      role: inviteRole,
      invited_by: requesterDoc.id,
      invited_by_name: requesterData.name,
      status: "pending",
      created_at: now,
    });

    // Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/${inviteRef.id}`;

    await adminDb.collection("mail").add({
      to: normalizedEmail,
      message: {
        subject: `${requesterData.name} invited you to join ${tenantName} on WhatsTask`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: #7C3AED; color: white; font-size: 20px; font-weight: bold; line-height: 48px;">W</div>
            </div>
            <h2 style="text-align: center; font-size: 20px; font-weight: 600; margin-bottom: 8px;">You've been invited!</h2>
            <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 32px;">
              <strong>${requesterData.name}</strong> invited you to join <strong>${tenantName}</strong> on WhatsTask as ${inviteRole === "admin" ? "an" : "a"} <strong>${inviteRole}</strong>.
            </p>
            <div style="text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: #7C3AED; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Accept Invitation
              </a>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
              If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
        `,
      },
    });

    return NextResponse.json({
      id: inviteRef.id,
      email: normalizedEmail,
      role: inviteRole,
      status: "pending",
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}

// GET: Validate an invite token
export async function GET(req: NextRequest) {
  try {
    const inviteId = req.nextUrl.searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json({ error: "No invite ID" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const inviteDoc = await adminDb.doc(`invites/${inviteId}`).get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const data = inviteDoc.data()!;

    if (data.status !== "pending") {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
    }

    return NextResponse.json({
      id: inviteDoc.id,
      tenant_name: data.tenant_name,
      role: data.role,
      invited_by_name: data.invited_by_name,
    });
  } catch (error) {
    console.error("Invite validation error:", error);
    return NextResponse.json({ error: "Failed to validate invite" }, { status: 500 });
  }
}
