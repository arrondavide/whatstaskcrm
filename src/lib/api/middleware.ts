import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ZodSchema } from "zod";
import { AppError, ErrorCodes } from "./errors";
import { error } from "./response";

export type AuthContext = {
  authUid: string;
  user: typeof users.$inferSelect;
  tenantId: string;
};

/**
 * Authenticate the request via Supabase Auth and resolve the app user + tenant.
 */
export async function withAuth(request: NextRequest): Promise<AuthContext> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op for API routes — cookies are read-only here
        },
      },
    }
  );

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, "Not authenticated", 401);
  }

  // Look up the app user by Supabase Auth UID
  // Support multi-workspace: check header or cookie for active tenant
  const requestedTenantId =
    request.headers.get("x-tenant-id") ||
    request.cookies.get("active_tenant_id")?.value;

  let appUser;
  if (requestedTenantId) {
    appUser = await db.query.users.findFirst({
      where: and(eq(users.authUid, authUser.id), eq(users.tenantId, requestedTenantId)),
    });
  }
  // Fallback: if no tenant specified or user not found in that tenant, use most recent
  if (!appUser) {
    appUser = await db.query.users.findFirst({
      where: eq(users.authUid, authUser.id),
      orderBy: (u, { desc }) => [desc(u.lastActive)],
    });
  }

  if (!appUser) {
    throw new AppError(ErrorCodes.USER_NOT_FOUND, "User profile not found. Complete onboarding first.", 404);
  }

  return {
    authUid: authUser.id,
    user: appUser,
    tenantId: appUser.tenantId,
  };
}

/**
 * Validate a request body against a Zod schema.
 */
export async function withValidation<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new AppError(ErrorCodes.VALIDATION_ERROR, message, 400);
  }

  return result.data;
}

/**
 * Wrap an API handler with automatic error handling.
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: unknown) => Promise<Response>
) {
  return async (request: NextRequest, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (err) {
      return error(err);
    }
  };
}
