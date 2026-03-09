import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// POST /api/tenants — create a new tenant (during onboarding)
export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, userName, companyName, primaryColor, recordLabel, recordLabelSingular, inviteEmails } = await req.json();

    if (!userId || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Create tenant document
    const tenantRef = await adminDb.collection("tenants").add({
      branding: {
        name: companyName,
        logo_url: null,
        primary_color: primaryColor || "#7C3AED",
        theme: "dark",
      },
      subscription: {
        status: "free",
        trial_end_date: null,
        billing_email: null,
      },
      record_label: recordLabel || "Records",
      record_label_singular: recordLabelSingular || "Record",
      document_label: "Documents",
      created_at: now,
      created_by: userId,
    });

    const tenantId = tenantRef.id;

    // Create admin user in tenant
    await adminDb.doc(`tenants/${tenantId}/users/${userId}`).set({
      email: userEmail,
      name: userName,
      role: "admin",
      status: "active",
      permissions: {
        records: { create: true, read: true, update: true, delete: true, export: true, view_sensitive: true },
        employees: { invite: true, remove: true, change_role: true, view_activity: true },
        chat: { send: true, delete_own: true, view_logs: true },
        settings: { edit_fields: true, edit_branding: true, edit_templates: true, manage_views: true },
      },
      created_at: now,
    });

    // Send invites if any
    if (inviteEmails && inviteEmails.length > 0) {
      for (const email of inviteEmails) {
        await adminDb.collection(`tenants/${tenantId}/invites`).add({
          email,
          role: "employee",
          invited_by: userId,
          created_at: now,
          status: "pending",
        });
        // TODO: Send email invitation via Resend
      }
    }

    // Audit log
    await adminDb.collection(`tenants/${tenantId}/audit_logs`).add({
      tenant_id: tenantId,
      timestamp: now,
      user_id: userId,
      user_name: userName,
      user_role: "admin",
      action: "SETTINGS_CHANGED",
      entity_type: "settings",
      entity_id: tenantId,
      entity_name: "Workspace created",
    });

    return NextResponse.json({ tenant_id: tenantId });
  } catch (error) {
    console.error("Create tenant error:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
