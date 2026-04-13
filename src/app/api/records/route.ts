import { NextRequest } from "next/server";
import { withAuth, withValidation, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { db } from "@/db";
import { records, activity } from "@/db/schema";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { createRecordSchema } from "@/validators/record";

// GET /api/records — List records with pagination, search, filters
export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const search = searchParams.get("search") ?? "";
  const sortField = searchParams.get("sortField") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
  const stage = searchParams.get("stage");
  const assignedTo = searchParams.get("assignedTo");

  const conditions = [
    eq(records.tenantId, auth.tenantId),
    eq(records.deleted, false),
  ];

  if (stage) conditions.push(eq(records.pipelineStage, stage));
  if (assignedTo) conditions.push(eq(records.assignedTo, assignedTo));

  const where = and(...conditions);

  // Build search condition using full-text search vector
  let searchWhere = where;
  if (search) {
    searchWhere = and(
      where,
      sql`search_vector @@ plainto_tsquery('english', ${search})`
    );
  }

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(records)
      .where(searchWhere!)
      .orderBy(sortDir === "asc" ? sql`${records.createdAt} ASC` : desc(records.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(records)
      .where(searchWhere!),
  ]);

  const total = Number(countResult[0].count);

  return success({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
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
