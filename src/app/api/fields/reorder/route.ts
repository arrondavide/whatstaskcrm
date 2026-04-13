import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { fields } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { reorderFieldsSchema } from "@/validators/field";

// PUT /api/fields/reorder — Reorder fields
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { fieldIds } = reorderFieldsSchema.parse(await request.json());

  // Update each field's order in a loop
  // Use a temporary high offset to avoid unique constraint conflicts
  const offset = 10000;

  // First pass: set all to temp high values
  for (let i = 0; i < fieldIds.length; i++) {
    await db
      .update(fields)
      .set({ fieldOrder: offset + i })
      .where(and(eq(fields.id, fieldIds[i]), eq(fields.tenantId, auth.tenantId)));
  }

  // Second pass: set to final values
  for (let i = 0; i < fieldIds.length; i++) {
    await db
      .update(fields)
      .set({ fieldOrder: i + 1, updatedAt: new Date() })
      .where(and(eq(fields.id, fieldIds[i]), eq(fields.tenantId, auth.tenantId)));
  }

  return success({ reordered: fieldIds.length });
});
