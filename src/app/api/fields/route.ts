import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// GET /api/fields — fetch all fields for a tenant
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection(`tenants/${tenantId}/schemas/fields`)
      .orderBy("order")
      .get();

    const fields = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ fields });
  } catch (error) {
    console.error("Fetch fields error:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}

// POST /api/fields — create a new field
export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id");
    const userId = req.headers.get("x-user-id");
    const userName = req.headers.get("x-user-name");

    if (!tenantId || !userId) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
    }

    const fieldData = await req.json();
    const now = new Date().toISOString();

    const docRef = await adminDb
      .collection(`tenants/${tenantId}/schemas/fields`)
      .add({
        ...fieldData,
        created_at: now,
        created_by: userId,
      });

    // Audit log
    await adminDb.collection(`tenants/${tenantId}/audit_logs`).add({
      tenant_id: tenantId,
      timestamp: now,
      user_id: userId,
      user_name: userName || "Unknown",
      user_role: "",
      action: "FIELD_CREATED",
      entity_type: "field",
      entity_id: docRef.id,
      entity_name: fieldData.label,
    });

    return NextResponse.json({
      field: { id: docRef.id, ...fieldData, created_at: now, created_by: userId },
    });
  } catch (error) {
    console.error("Create field error:", error);
    return NextResponse.json({ error: "Failed to create field" }, { status: 500 });
  }
}
