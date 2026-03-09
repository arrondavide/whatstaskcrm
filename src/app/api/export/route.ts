import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// POST /api/export — generate export data for a record
export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id");
    const userId = req.headers.get("x-user-id");
    const userName = req.headers.get("x-user-name");

    if (!tenantId || !userId) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
    }

    const { record_id, template_id } = await req.json();

    // Get record
    const recordDoc = await adminDb
      .doc(`tenants/${tenantId}/records/${record_id}`)
      .get();

    if (!recordDoc.exists) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const record = recordDoc.data();

    // Get fields (to know which are sensitive)
    const fieldsSnapshot = await adminDb
      .collection(`tenants/${tenantId}/schemas/fields`)
      .orderBy("order")
      .get();

    const fields = fieldsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter out sensitive fields
    const exportData: Record<string, unknown> = {};
    const exportFields: { label: string; value: unknown }[] = [];

    for (const field of fields) {
      const fieldData = field as { id: string; label: string; sensitive: boolean };
      if (fieldData.sensitive) continue; // Skip sensitive fields

      const value = record?.data?.[fieldData.id];
      if (value !== null && value !== undefined && value !== "") {
        exportData[fieldData.id] = value;
        exportFields.push({ label: fieldData.label, value });
      }
    }

    // Get tenant branding
    const tenantDoc = await adminDb.doc(`tenants/${tenantId}`).get();
    const tenantData = tenantDoc.data();

    // Audit log
    const now = new Date().toISOString();
    await adminDb.collection(`tenants/${tenantId}/audit_logs`).add({
      tenant_id: tenantId,
      timestamp: now,
      user_id: userId,
      user_name: userName || "Unknown",
      user_role: "",
      action: "CERTIFICATE_EXPORTED",
      entity_type: "record",
      entity_id: record_id,
    });

    // Return export-ready data
    // In production, this would generate a PDF via Puppeteer Cloud Function
    return NextResponse.json({
      export: {
        branding: tenantData?.branding,
        fields: exportFields,
        exported_at: now,
        exported_by: userName,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
