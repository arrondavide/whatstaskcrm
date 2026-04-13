import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { db } from "@/db";
import { records, fields } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/export — Export records as CSV
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  // Get fields for headers
  const tenantFields = await db.query.fields.findMany({
    where: eq(fields.tenantId, auth.tenantId),
    orderBy: (f, { asc }) => [asc(f.fieldOrder)],
  });

  // Get all active records (max 10,000)
  const allRecords = await db
    .select()
    .from(records)
    .where(and(eq(records.tenantId, auth.tenantId), eq(records.deleted, false)))
    .orderBy(desc(records.createdAt))
    .limit(10000);

  // Build CSV
  const headers = [
    "ID",
    ...tenantFields.map((f) => f.label),
    "Pipeline Stage",
    "Tags",
    "Created At",
  ];

  const escapeCSV = (val: unknown): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = allRecords.map((record) => [
    record.id,
    ...tenantFields.map((f) => escapeCSV(record.data?.[f.id] ?? "")),
    escapeCSV(record.pipelineStage ?? ""),
    escapeCSV((record.tags ?? []).join(", ")),
    record.createdAt ? new Date(record.createdAt).toISOString() : "",
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="records_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
