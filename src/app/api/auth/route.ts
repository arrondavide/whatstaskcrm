import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

// Verify session and return user + tenant info
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    let adminAuth, adminDb;
    try {
      adminAuth = getAdminAuth();
      adminDb = getAdminDb();
    } catch (initError) {
      console.error("Admin SDK init failed:", initError);
      return NextResponse.json({ error: "Server configuration error", details: String(initError) }, { status: 500 });
    }

    // Verify the Firebase ID token
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError);
      return NextResponse.json({ error: "Invalid token", details: String(tokenError) }, { status: 401 });
    }

    // Find user across tenants by email
    let usersSnapshot;
    try {
      usersSnapshot = await adminDb
        .collectionGroup("users")
        .where("email", "==", decoded.email)
        .limit(1)
        .get();
    } catch (queryError) {
      console.error("Firestore collectionGroup query failed:", queryError);
      console.error("This likely means a collection group index is needed for 'users.email'");
      return NextResponse.json({
        error: "Database query failed — collection group index may be missing",
        details: String(queryError)
      }, { status: 500 });
    }

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
    console.error("Auth unexpected error:", message);
    return NextResponse.json({ error: "Unexpected server error", details: message }, { status: 500 });
  }
}
