import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { records, fields } from "@/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";

// GET /api/records/duplicates?data={...}&excludeId=xxx
// Finds potential duplicate records based on email, phone, or name fields
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { searchParams } = new URL(request.url);
  const dataParam = searchParams.get("data");
  const excludeId = searchParams.get("excludeId");

  if (!dataParam) return success([]);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataParam);
  } catch {
    return success([]);
  }

  // Get tenant fields to find email, phone, and text fields
  const tenantFields = await db.query.fields.findMany({
    where: eq(fields.tenantId, auth.tenantId),
  });

  // Build duplicate detection conditions
  const matchConditions: ReturnType<typeof sql>[] = [];

  for (const field of tenantFields) {
    const value = data[field.id];
    if (!value || String(value).trim() === "") continue;

    if (field.type === "email" || field.type === "phone") {
      // Exact match on email/phone
      matchConditions.push(
        sql`data->>${field.id} = ${String(value)}`
      );
    } else if (field.type === "text" && field.fieldOrder <= 2) {
      // Fuzzy match on first 2 text fields (likely name fields)
      matchConditions.push(
        sql`LOWER(data->>${field.id}) = LOWER(${String(value)})`
      );
    }
  }

  if (matchConditions.length === 0) return success([]);

  // Find records matching ANY of these conditions
  const baseConditions = [
    eq(records.tenantId, auth.tenantId),
    eq(records.deleted, false),
  ];
  if (excludeId) {
    baseConditions.push(ne(records.id, excludeId));
  }

  const duplicates = await db
    .select()
    .from(records)
    .where(
      and(
        ...baseConditions,
        sql`(${sql.join(matchConditions, sql` OR `)})`
      )
    )
    .limit(10);

  // Calculate match score for each
  const scored = duplicates.map((record) => {
    let score = 0;
    const matchedFields: string[] = [];

    for (const field of tenantFields) {
      const inputVal = String(data[field.id] ?? "").toLowerCase().trim();
      const recordVal = String((record.data as Record<string, unknown>)?.[field.id] ?? "").toLowerCase().trim();
      if (!inputVal || !recordVal) continue;

      if (field.type === "email" && inputVal === recordVal) {
        score += 50;
        matchedFields.push(field.label);
      } else if (field.type === "phone" && inputVal.replace(/\D/g, "") === recordVal.replace(/\D/g, "")) {
        score += 40;
        matchedFields.push(field.label);
      } else if (field.type === "text" && inputVal === recordVal) {
        score += 30;
        matchedFields.push(field.label);
      }
    }

    return { ...record, duplicateScore: score, matchedFields };
  });

  return success(scored.filter((r) => r.duplicateScore > 0).sort((a, b) => b.duplicateScore - a.duplicateScore));
});
