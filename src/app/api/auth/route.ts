import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

// Verify session and return user + tenant info
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);

    // Find user across tenants by UID first, then by email
    let usersSnapshot = await adminDb
      .collectionGroup("users")
      .where("email", "==", decoded.email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const tenantId = userDoc.ref.parent.parent?.id;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get tenant info
    const tenantDoc = await adminDb.doc(`tenants/${tenantId}`).get();

    if (!tenantDoc.exists) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tenantData = tenantDoc.data();

    // Check subscription status
    if (tenantData?.subscription?.status === "suspended") {
      return NextResponse.json(
        { error: "Account suspended. Contact support." },
        { status: 403 }
      );
    }

    // Update last_active
    userDoc.ref.update({ last_active: new Date().toISOString() }).catch(() => {});

    // Get fields for this tenant
    const fieldsSnapshot = await adminDb
      .collection(`tenants/${tenantId}/fields`)
      .orderBy("order")
      .get();

    const fields = fieldsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      user: {
        id: userDoc.id,
        tenant_id: tenantId,
        ...userData,
      },
      tenant: {
        id: tenantId,
        ...tenantData,
      },
      fields,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Auth error details:", message);
    console.error("FIREBASE_ADMIN_PROJECT_ID set:", !!process.env.FIREBASE_ADMIN_PROJECT_ID);
    console.error("FIREBASE_ADMIN_CLIENT_EMAIL set:", !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
    console.error("FIREBASE_ADMIN_PRIVATE_KEY set:", !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
    console.error("FIREBASE_ADMIN_PRIVATE_KEY length:", process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0);

    // Distinguish between config errors and auth errors
    if (message.includes("credential") || message.includes("FIREBASE_ADMIN") || message.includes("Failed to determine service account") || message.includes("not configured")) {
      return NextResponse.json({ error: "Server configuration error", details: message }, { status: 500 });
    }
    return NextResponse.json({ error: "Authentication failed", details: message }, { status: 401 });
  }
}
