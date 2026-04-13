export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
  FIELD_NOT_FOUND: "FIELD_NOT_FOUND",
  INVITE_EXPIRED: "INVITE_EXPIRED",
  INVITE_ALREADY_ACCEPTED: "INVITE_ALREADY_ACCEPTED",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
