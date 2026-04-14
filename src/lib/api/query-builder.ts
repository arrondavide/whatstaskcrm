import { db } from "@/db";
import { records } from "@/db/schema";
import { eq, and, or, desc, asc, sql, SQL } from "drizzle-orm";
import type { FilterGroup } from "@/types";

type QueryParams = {
  tenantId: string;
  filters?: FilterGroup;
  search?: string;
  stage?: string;
  assignedTo?: string;
  sortField?: string;
  sortDir?: "asc" | "desc";
  page: number;
  pageSize: number;
};

function buildFilterCondition(filter: { fieldId: string; operator: string; value: unknown }): SQL | null {
  const path = sql.raw(`data->>'${filter.fieldId}'`);
  const val = filter.value;

  switch (filter.operator) {
    case "equals":
      return sql`${path} = ${String(val)}`;
    case "not_equals":
      return sql`${path} != ${String(val)}`;
    case "contains":
      return sql`${path} ILIKE ${'%' + String(val) + '%'}`;
    case "not_contains":
      return sql`${path} NOT ILIKE ${'%' + String(val) + '%'}`;
    case "starts_with":
      return sql`${path} ILIKE ${String(val) + '%'}`;
    case "ends_with":
      return sql`${path} ILIKE ${'%' + String(val)}`;
    case "gt":
      return sql`(${path})::numeric > ${Number(val)}`;
    case "gte":
      return sql`(${path})::numeric >= ${Number(val)}`;
    case "lt":
      return sql`(${path})::numeric < ${Number(val)}`;
    case "lte":
      return sql`(${path})::numeric <= ${Number(val)}`;
    case "is_empty":
      return sql`(${path} IS NULL OR ${path} = '')`;
    case "is_not_empty":
      return sql`(${path} IS NOT NULL AND ${path} != '')`;
    case "in": {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) return null;
      const placeholders = arr.map((v) => sql`${String(v)}`);
      return sql`${path} IN (${sql.join(placeholders, sql`, `)})`;
    }
    case "not_in": {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.length === 0) return null;
      const placeholders = arr.map((v) => sql`${String(v)}`);
      return sql`${path} NOT IN (${sql.join(placeholders, sql`, `)})`;
    }
    default:
      return null;
  }
}

export async function queryRecords(params: QueryParams) {
  const conditions: SQL[] = [
    eq(records.tenantId, params.tenantId),
    eq(records.deleted, false),
  ];

  // Pipeline stage filter
  if (params.stage) {
    conditions.push(eq(records.pipelineStage, params.stage));
  }

  // Assigned to filter
  if (params.assignedTo) {
    conditions.push(eq(records.assignedTo, params.assignedTo));
  }

  // Full-text search
  if (params.search) {
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${params.search})`);
  }

  // Dynamic filters
  if (params.filters && params.filters.filters.length > 0) {
    const filterConditions: SQL[] = [];
    for (const filter of params.filters.filters) {
      const cond = buildFilterCondition(filter as { fieldId: string; operator: string; value: unknown });
      if (cond) filterConditions.push(cond);
    }

    if (filterConditions.length > 0) {
      if (params.filters.match === "any") {
        conditions.push(or(...filterConditions)!);
      } else {
        conditions.push(and(...filterConditions)!);
      }
    }
  }

  const where = and(...conditions)!;

  // Sort
  let orderBy;
  if (params.sortField && params.sortField !== "createdAt") {
    const direction = params.sortDir === "asc" ? sql`ASC` : sql`DESC`;
    orderBy = sql`data->>'${sql.raw(params.sortField)}' ${direction}`;
  } else {
    orderBy = params.sortDir === "asc" ? asc(records.createdAt) : desc(records.createdAt);
  }

  // Execute query + count in parallel
  const offset = (params.page - 1) * params.pageSize;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(records)
      .where(where)
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(records)
      .where(where),
  ]);

  const total = Number(countResult[0].count);

  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
