import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { savedViews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createViewSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.object({ match: z.enum(["all", "any"]), filters: z.array(z.unknown()) }),
  sort: z.array(z.unknown()).optional(),
  columns: z.array(z.string()).optional(),
  shared: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

// GET /api/views
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const views = await db.query.savedViews.findMany({
    where: eq(savedViews.tenantId, auth.tenantId),
    orderBy: (v, { desc }) => [desc(v.pinned), desc(v.createdAt)],
  });

  return success(views);
});

// POST /api/views
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = createViewSchema.parse(await request.json());

  const [view] = await db
    .insert(savedViews)
    .values({
      tenantId: auth.tenantId,
      name: body.name,
      filters: body.filters as { match: "all" | "any"; filters: unknown[] },
      sort: body.sort ?? [],
      columns: (body.columns ?? []) as string[],
      shared: body.shared ?? false,
      pinned: body.pinned ?? false,
      createdBy: auth.authUid,
    })
    .returning();

  return success(view, 201);
});

// DELETE /api/views
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { id } = await request.json();

  if (!id) throw new AppError(ErrorCodes.VALIDATION_ERROR, "View ID required", 400);

  await db
    .delete(savedViews)
    .where(and(eq(savedViews.id, id), eq(savedViews.tenantId, auth.tenantId)));

  return success({ deleted: true });
});
