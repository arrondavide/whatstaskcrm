import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { onboardingSchema } from "@/validators/auth";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { success, error } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  try {
    // Get auth user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, "Not authenticated", 401);
    }

    // Validate body
    const body = await request.json();
    const result = onboardingSchema.safeParse(body);
    if (!result.success) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        result.error.issues.map((i) => i.message).join(", "),
        400
      );
    }

    const { companyName, userName, recordLabel, recordLabelSingular } = result.data;

    // Create tenant
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: companyName,
        recordLabel: recordLabel ?? "Records",
        recordLabelSingular: recordLabelSingular ?? "Record",
        createdBy: authUser.id,
      })
      .returning();

    // Create admin user
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        authUid: authUser.id,
        email: authUser.email!,
        name: userName,
        avatarUrl: authUser.user_metadata?.avatar_url ?? null,
        role: "admin",
        status: "active",
        permissions: ROLE_PERMISSIONS.admin,
      })
      .returning();

    return success({ tenant, user }, 201);
  } catch (err) {
    return error(err);
  }
}
