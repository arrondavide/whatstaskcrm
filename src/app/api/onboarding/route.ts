import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_PERMISSIONS } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const { token, companyName, primaryColor, theme, recordLabel, recordLabelSingular, logoUrl, inviteEmails } = await req.json();

    if (!token || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name || decoded.email?.split("@")[0] || "Admin";
    const photoURL = decoded.picture || null;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Check if user already has a tenant
    const existingUser = await adminDb
      .collectionGroup("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return NextResponse.json({ error: "User already has a workspace" }, { status: 409 });
    }

    const now = new Date().toISOString();

    // Create tenant document
    const tenantRef = adminDb.collection("tenants").doc();
    const tenantData = {
      branding: {
        name: companyName,
        logo_url: logoUrl || null,
        primary_color: primaryColor || "#7C3AED",
        theme: theme || "dark",
      },
      subscription: {
        status: "free" as const,
      },
      record_label: recordLabel || "Records",
      record_label_singular: recordLabelSingular || "Record",
      document_label: "Documents",
      created_at: now,
      created_by: uid,
    };

    // Create admin user document under tenant
    const userRef = tenantRef.collection("users").doc(uid);
    const userData = {
      email,
      name,
      avatar_url: photoURL,
      role: "admin" as const,
      status: "active" as const,
      permissions: DEFAULT_PERMISSIONS.admin,
      created_at: now,
      last_active: now,
    };

    // Batch write
    const batch = adminDb.batch();
    batch.set(tenantRef, tenantData);
    batch.set(userRef, userData);

    // Create invite documents for each email
    if (inviteEmails && Array.isArray(inviteEmails) && inviteEmails.length > 0) {
      for (const inviteEmail of inviteEmails) {
        if (!inviteEmail || inviteEmail === email) continue;

        const inviteRef = adminDb.collection("invites").doc();
        batch.set(inviteRef, {
          tenant_id: tenantRef.id,
          tenant_name: companyName,
          email: inviteEmail.toLowerCase().trim(),
          role: "employee" as const,
          invited_by: uid,
          invited_by_name: name,
          status: "pending",
          created_at: now,
        });
      }
    }

    await batch.commit();

    // Send invite emails (fire and forget)
    if (inviteEmails && inviteEmails.length > 0) {
      sendInviteEmails(inviteEmails, companyName, name, tenantRef.id).catch(console.error);
    }

    return NextResponse.json({
      user: {
        id: uid,
        tenant_id: tenantRef.id,
        ...userData,
      },
      tenant: {
        id: tenantRef.id,
        ...tenantData,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}

async function sendInviteEmails(emails: string[], companyName: string, inviterName: string, tenantId: string) {
  // For each email, look up their invite doc and send email
  const adminDb = getAdminDb();

  for (const email of emails) {
    try {
      // Find the invite doc we just created
      const inviteSnap = await adminDb
        .collection("invites")
        .where("email", "==", email.toLowerCase().trim())
        .where("tenant_id", "==", tenantId)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (inviteSnap.empty) continue;

      const inviteId = inviteSnap.docs[0].id;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${appUrl}/invite/${inviteId}`;

      // Store email task in Firestore for the mail extension
      // or use a simple approach: store in a "mail" collection
      // Firebase Extension "Trigger Email" can pick these up
      await adminDb.collection("mail").add({
        to: email,
        message: {
          subject: `${inviterName} invited you to join ${companyName} on WhatsTask`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: #7C3AED; color: white; font-size: 20px; font-weight: bold; line-height: 48px;">W</div>
              </div>
              <h2 style="text-align: center; font-size: 20px; font-weight: 600; margin-bottom: 8px;">You've been invited!</h2>
              <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 32px;">
                <strong>${inviterName}</strong> invited you to join <strong>${companyName}</strong> on WhatsTask.
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
    } catch (err) {
      console.error(`Failed to send invite email to ${email}:`, err);
    }
  }
}
