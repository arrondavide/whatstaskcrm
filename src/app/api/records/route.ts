import { NextRequest } from "next/server";
import { withAuth, withValidation, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { records, activity } from "@/db/schema";
import { createRecordSchema } from "@/validators/record";
import { queryRecords } from "@/lib/api/query-builder";

// GET /api/records — List records with pagination, search, filters
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const search = searchParams.get("search") || undefined;
  const sortField = searchParams.get("sortField") || undefined;
  const sortDir = (searchParams.get("sortDir") === "asc" ? "asc" : "desc") as "asc" | "desc";
  const stage = searchParams.get("stage") || undefined;
  const assignedTo = searchParams.get("assignedTo") || undefined;

  // Parse filters JSON from query param
  let filters;
  const filtersParam = searchParams.get("filters");
  if (filtersParam) {
    try {
      filters = JSON.parse(filtersParam);
    } catch {
      // ignore invalid JSON
    }
  }

  const result = await queryRecords({
    tenantId: auth.tenantId,
    filters,
    search,
    stage,
    assignedTo,
    sortField,
    sortDir,
    page,
    pageSize,
  });

  return success(result);
});

// POST /api/records — Create a new record
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const body = await withValidation(request, createRecordSchema);

  const [record] = await db
    .insert(records)
    .values({
      tenantId: auth.tenantId,
      data: body.data,
      pipelineStage: body.pipelineStage,
      assignedTo: body.assignedTo,
      tags: body.tags ?? [],
      createdBy: auth.authUid,
    })
    .returning();

  // Audit log
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "record.created",
    entityType: "record",
    entityId: record.id,
    snapshot: record.data as Record<string, unknown>,
  });

  return success(record, 201);
});
