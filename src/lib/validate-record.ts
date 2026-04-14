import type { FieldItem } from "@/hooks/queries/use-fields";

type ValidationError = { fieldId: string; label: string; message: string };

export function validateRecordData(
  data: Record<string, unknown>,
  fields: FieldItem[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = data[field.id];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    // Required check
    if (field.required && isEmpty) {
      errors.push({
        fieldId: field.id,
        label: field.label,
        message: `${field.label} is required`,
      });
      continue;
    }

    // Skip further validation if empty and not required
    if (isEmpty) continue;

    // Type-specific validation
    switch (field.type) {
      case "email": {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== "string" || !emailRegex.test(value)) {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} must be a valid email` });
        }
        break;
      }

      case "phone": {
        const cleaned = String(value).replace(/[\s\-().+]/g, "");
        if (cleaned.length < 7 || !/^\d+$/.test(cleaned)) {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} must be a valid phone number` });
        }
        break;
      }

      case "url": {
        try {
          new URL(String(value));
        } catch {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} must be a valid URL (include https://)` });
        }
        break;
      }

      case "number":
      case "currency": {
        if (isNaN(Number(value))) {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} must be a number` });
        }
        break;
      }

      case "select": {
        const config = field.config as { options?: { value: string }[] } | null;
        const options = config?.options ?? [];
        if (options.length > 0 && !options.some((o) => o.value === String(value))) {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} has an invalid option` });
        }
        break;
      }

      case "multi_select": {
        if (!Array.isArray(value)) {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} must be a list` });
        }
        break;
      }

      case "date": {
        const d = new Date(String(value));
        if (isNaN(d.getTime())) {
          errors.push({ fieldId: field.id, label: field.label, message: `${field.label} must be a valid date` });
        }
        break;
      }
    }
  }

  return errors;
}
