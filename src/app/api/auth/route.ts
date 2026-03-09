import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

// Verify session and return user + tenant info
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token);

    // Get user document from Firestore
    // Find user across tenants by email
    const usersSnapshot = await adminDb
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
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}
