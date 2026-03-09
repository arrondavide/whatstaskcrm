import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_PERMISSIONS } from "@/types/user";
import type { UserRole } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const { token, inviteId } = await req.json();

    if (!token || !inviteId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name || decoded.email?.split("@")[0] || "User";
    const photoURL = decoded.picture || null;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Get the invite
    const inviteRef = adminDb.doc(`invites/${inviteId}`);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const inviteData = inviteDoc.data()!;

    if (inviteData.status !== "pending") {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
    }

    // Verify email matches (case-insensitive)
    if (inviteData.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email. Please sign in with the correct Google account." },
        { status: 403 }
      );
    }

    const tenantId = inviteData.tenant_id;
    const role: UserRole = inviteData.role || "employee";
    const now = new Date().toISOString();

    // Check if user already exists in this tenant
    const existingUser = await adminDb
      .doc(`tenants/${tenantId}/users/${uid}`)
      .get();

    if (existingUser.exists) {
      // Already a member, just mark invite as accepted
      await inviteRef.update({ status: "accepted", accepted_at: now });

      const userData = existingUser.data()!;
      const tenantDoc = await adminDb.doc(`tenants/${tenantId}`).get();

      return NextResponse.json({
        user: { id: uid, tenant_id: tenantId, ...userData },
        tenant: { id: tenantId, ...tenantDoc.data() },
      });
    }

    // Create user document under tenant
    const userData = {
      email,
      name,
      avatar_url: photoURL,
      role,
      status: "active" as const,
      permissions: DEFAULT_PERMISSIONS[role],
      created_at: now,
      last_active: now,
    };

    const batch = adminDb.batch();
    batch.set(adminDb.doc(`tenants/${tenantId}/users/${uid}`), userData);
    batch.update(inviteRef, { status: "accepted", accepted_at: now, accepted_by: uid });
    await batch.commit();

    // Get tenant data
    const tenantDoc = await adminDb.doc(`tenants/${tenantId}`).get();

    return NextResponse.json({
      user: { id: uid, tenant_id: tenantId, ...userData },
      tenant: { id: tenantId, ...tenantDoc.data() },
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
