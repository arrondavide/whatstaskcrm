/**
 * Formula evaluator for computed fields.
 *
 * Supported:
 *   Math: +, -, *, /, (, ), numbers
 *   Functions: SUM, AVG, MIN, MAX, ABS, ROUND, CEIL, FLOOR
 *   Date: DATEDIFF(date1, date2) → days between
 *   String: CONCAT(a, b, ...), UPPER(str), LOWER(str), LEN(str)
 *   Logic: IF(condition, then, else)
 *   Field references: {field_id}
 *
 * Examples:
 *   {price} * {quantity}
 *   ROUND({total} * 0.1, 2)
 *   IF({status} = "Active", "Yes", "No")
 *   DATEDIFF({end_date}, {start_date})
 *   CONCAT({first_name}, " ", {last_name})
 */

type FieldValues = Record<string, unknown>;

export function evaluateFormula(formula: string, fieldValues: FieldValues): unknown {
  try {
    // Replace {field_id} with actual values
    let expr = formula.replace(/\{([^}]+)\}/g, (_, fieldId) => {
      const val = fieldValues[fieldId];
      if (val === null || val === undefined) return "null";
      if (typeof val === "string") return JSON.stringify(val);
      if (typeof val === "number") return String(val);
      if (typeof val === "boolean") return String(val);
      return JSON.stringify(String(val));
    });

    // Process functions
    expr = processFunctions(expr);

    // Evaluate the expression safely (no eval)
    return safeEvaluate(expr);
  } catch (e) {
    return `#ERROR: ${e instanceof Error ? e.message : "Invalid formula"}`;
  }
}

function processFunctions(expr: string): string {
  // Process innermost function calls first (recursive)
  let result = expr;
  let iterations = 0;

  while (/\b[A-Z]+\s*\(/.test(result) && iterations < 50) {
    iterations++;

    // DATEDIFF(date1, date2)
    result = result.replace(/DATEDIFF\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/gi, (_, d1, d2) => {
      const diff = (new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
      return String(Math.round(diff));
    });

    // CONCAT(a, b, ...)
    result = result.replace(/CONCAT\s*\(([^)]+)\)/gi, (_, args) => {
      const parts = splitArgs(args).map((a) => {
        const trimmed = a.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
        return trimmed === "null" ? "" : trimmed;
      });
      return JSON.stringify(parts.join(""));
    });

    // UPPER / LOWER / LEN
    result = result.replace(/UPPER\s*\(\s*"([^"]*)"\s*\)/gi, (_, s) => JSON.stringify(s.toUpperCase()));
    result = result.replace(/LOWER\s*\(\s*"([^"]*)"\s*\)/gi, (_, s) => JSON.stringify(s.toLowerCase()));
    result = result.replace(/LEN\s*\(\s*"([^"]*)"\s*\)/gi, (_, s) => String(s.length));

    // ROUND, CEIL, FLOOR, ABS
    result = result.replace(/ROUND\s*\(\s*([\d.]+)\s*(?:,\s*(\d+))?\s*\)/gi, (_, num, dec) => {
      const d = dec ? Number(dec) : 0;
      return String(Number(Number(num).toFixed(d)));
    });
    result = result.replace(/CEIL\s*\(\s*([\d.]+)\s*\)/gi, (_, n) => String(Math.ceil(Number(n))));
    result = result.replace(/FLOOR\s*\(\s*([\d.]+)\s*\)/gi, (_, n) => String(Math.floor(Number(n))));
    result = result.replace(/ABS\s*\(\s*(-?[\d.]+)\s*\)/gi, (_, n) => String(Math.abs(Number(n))));

    // SUM, AVG, MIN, MAX
    result = result.replace(/SUM\s*\(([^)]+)\)/gi, (_, args) => {
      const nums = splitArgs(args).map((a) => Number(a.trim())).filter((n) => !isNaN(n));
      return String(nums.reduce((s, n) => s + n, 0));
    });
    result = result.replace(/AVG\s*\(([^)]+)\)/gi, (_, args) => {
      const nums = splitArgs(args).map((a) => Number(a.trim())).filter((n) => !isNaN(n));
      return nums.length > 0 ? String(nums.reduce((s, n) => s + n, 0) / nums.length) : "0";
    });
    result = result.replace(/MIN\s*\(([^)]+)\)/gi, (_, args) => {
      const nums = splitArgs(args).map((a) => Number(a.trim())).filter((n) => !isNaN(n));
      return String(Math.min(...nums));
    });
    result = result.replace(/MAX\s*\(([^)]+)\)/gi, (_, args) => {
      const nums = splitArgs(args).map((a) => Number(a.trim())).filter((n) => !isNaN(n));
      return String(Math.max(...nums));
    });

    // IF(condition, then, else)
    result = result.replace(/IF\s*\(\s*(.+?)\s*=\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*\)/gi, (_, a, b, then, els) => {
      const av = a.trim().replace(/^"|"$/g, "");
      const bv = b.trim().replace(/^"|"$/g, "");
      return av === bv ? then.trim() : els.trim();
    });
  }

  return result;
}

function splitArgs(str: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let depth = 0;

  for (const ch of str) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "(" && !inQuotes) depth++;
    if (ch === ")" && !inQuotes) depth--;
    if (ch === "," && !inQuotes && depth === 0) {
      args.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  args.push(current);
  return args;
}

function safeEvaluate(expr: string): unknown {
  const trimmed = expr.trim();

  // If it's a quoted string, return the string
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  // If it's null
  if (trimmed === "null") return null;

  // Try to evaluate as math expression
  if (/^[\d\s+\-*/().]+$/.test(trimmed)) {
    // Safe: only numbers and math operators
    const fn = new Function(`return (${trimmed})`);
    const result = fn();
    return typeof result === "number" && isFinite(result) ? result : "#ERROR";
  }

  // Return as-is (string without quotes)
  return trimmed;
}
