import { NextRequest } from "next/server";
import { withAuth, withValidation, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { fields, activity } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createFieldSchema } from "@/validators/field";

// GET /api/fields — List all fields for the tenant
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const result = await db.query.fields.findMany({
    where: eq(fields.tenantId, auth.tenantId),
    orderBy: (f, { asc }) => [asc(f.fieldOrder)],
  });

  return success(result);
});

// POST /api/fields — Create a new field
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await withValidation(request, createFieldSchema);

  // Get next field order
  const maxOrder = await db
    .select({ max: sql<number>`COALESCE(MAX(field_order), 0)` })
    .from(fields)
    .where(eq(fields.tenantId, auth.tenantId));

  const [field] = await db
    .insert(fields)
    .values({
      tenantId: auth.tenantId,
      label: body.label,
      type: body.type,
      fieldOrder: maxOrder[0].max + 1,
      required: body.required ?? false,
      sensitive: body.sensitive ?? false,
      filterable: body.filterable ?? true,
      searchable: body.searchable ?? true,
      showInTable: body.showInTable ?? true,
      config: body.config ?? {},
      createdBy: auth.authUid,
    })
    .returning();

  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "field.created",
    entityType: "field",
    entityId: field.id,
    entityName: field.label,
  });

  return success(field, 201);
});
