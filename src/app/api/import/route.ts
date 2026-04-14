import { NextRequest } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { AppError, ErrorCodes } from "@/lib/api/errors";
import { db } from "@/db";
import { records, fields, activity } from "@/db/schema";
import { eq } from "drizzle-orm";

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

// POST /api/import — Import records from CSV
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await withAuth(request);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "No file provided", 400);
  }

  if (!file.name.endsWith(".csv")) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "File must be a CSV", 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "File too large (max 10MB)", 400);
  }

  const text = await file.text();
  const { headers, rows } = parseCSV(text);

  if (headers.length === 0 || rows.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "CSV is empty or has no data rows", 400);
  }

  // Get tenant fields to map CSV headers → field IDs
  const tenantFields = await db.query.fields.findMany({
    where: eq(fields.tenantId, auth.tenantId),
    orderBy: (f, { asc }) => [asc(f.fieldOrder)],
  });

  // Build mapping: CSV header → field ID (match by label, case-insensitive)
  const headerToFieldId: (string | null)[] = headers.map((h) => {
    const match = tenantFields.find(
      (f) => f.label.toLowerCase().trim() === h.toLowerCase().trim()
    );
    return match ? match.id : null;
  });

  const mappedCount = headerToFieldId.filter(Boolean).length;
  if (mappedCount === 0) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `No CSV headers matched your fields. Your fields are: ${tenantFields.map((f) => f.label).join(", ")}`,
      400
    );
  }

  // Build records from rows
  const recordValues = rows
    .filter((row) => row.some((cell) => cell.trim())) // skip empty rows
    .map((row) => {
      const data: Record<string, unknown> = {};
      headers.forEach((_, colIdx) => {
        const fieldId = headerToFieldId[colIdx];
        if (fieldId && row[colIdx] !== undefined && row[colIdx] !== "") {
          // Try to parse numbers and booleans
          const field = tenantFields.find((f) => f.id === fieldId);
          const val = row[colIdx];
          if (field?.type === "number" || field?.type === "currency") {
            const num = Number(val);
            data[fieldId] = isNaN(num) ? val : num;
          } else if (field?.type === "boolean") {
            data[fieldId] = ["true", "yes", "1"].includes(val.toLowerCase());
          } else if (field?.type === "multi_select") {
            data[fieldId] = val.split(";").map((v) => v.trim()).filter(Boolean);
          } else {
            data[fieldId] = val;
          }
        }
      });
      return {
        tenantId: auth.tenantId,
        data,
        createdBy: auth.authUid,
      };
    });

  if (recordValues.length === 0) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "No valid rows found in CSV", 400);
  }

  // Insert in batches of 100
  let imported = 0;
  for (let i = 0; i < recordValues.length; i += 100) {
    const batch = recordValues.slice(i, i + 100);
    await db.insert(records).values(batch);
    imported += batch.length;
  }

  // Audit log
  await db.insert(activity).values({
    tenantId: auth.tenantId,
    userId: auth.authUid,
    userName: auth.user.name,
    userRole: auth.user.role,
    action: "record.imported",
    entityType: "record",
    entityName: `${imported} records from ${file.name}`,
  });

  return success({
    imported,
    totalRows: rows.length,
    mappedFields: mappedCount,
    unmappedHeaders: headers.filter((_, i) => !headerToFieldId[i]),
  });
});
