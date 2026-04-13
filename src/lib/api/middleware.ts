import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  const appUser = await db.query.users.findFirst({
    where: eq(users.authUid, authUser.id),
  });

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
