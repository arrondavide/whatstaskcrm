import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// GET /api/records — fetch all records for a tenant
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection(`tenants/${tenantId}/records`)
      .where("meta.deleted", "==", false)
      .orderBy("meta.created_at", "desc")
      .get();

    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Fetch records error:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

// POST /api/records — create a new record
export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get("x-tenant-id");
    const userId = req.headers.get("x-user-id");
    const userName = req.headers.get("x-user-name");

    if (!tenantId || !userId) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
    }

    const { data, pipeline_stage } = await req.json();

    const now = new Date().toISOString();

    const recordData = {
      tenant_id: tenantId,
      data,
      meta: {
        created_by: userId,
        created_at: now,
        updated_by: userId,
        updated_at: now,
        deleted: false,
        version: 1,
        pipeline_stage: pipeline_stage || null,
      },
    };

    const docRef = await adminDb
      .collection(`tenants/${tenantId}/records`)
      .add(recordData);

    // Create audit log
    await adminDb.collection(`tenants/${tenantId}/audit_logs`).add({
      tenant_id: tenantId,
      timestamp: now,
      user_id: userId,
      user_name: userName || "Unknown",
      user_role: "",
      action: "RECORD_CREATED",
      entity_type: "record",
      entity_id: docRef.id,
      changes: null,
      snapshot: null,
    });

    return NextResponse.json({
      record: { id: docRef.id, ...recordData },
    });
  } catch (error) {
    console.error("Create record error:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}
