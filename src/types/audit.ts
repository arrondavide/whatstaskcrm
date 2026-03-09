export type AuditAction =
  | "RECORD_CREATED"
  | "RECORD_UPDATED"
  | "RECORD_DELETED"
  | "RECORD_RESTORED"
  | "RECORD_VIEWED"
  | "FILE_UPLOADED"
  | "FILE_DOWNLOADED"
  | "FILE_DELETED"
  | "EMPLOYEE_INVITED"
  | "EMPLOYEE_REMOVED"
  | "EMPLOYEE_ROLE_CHANGED"
  | "CERTIFICATE_EXPORTED"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGED"
  | "FIELD_CREATED"
  | "FIELD_UPDATED"
  | "FIELD_DELETED"
  | "VIEW_CREATED"
  | "TEMPLATE_UPDATED"
  | "SETTINGS_CHANGED";

export type AuditEntityType =
  | "record"
  | "employee"
  | "file"
  | "field"
  | "template"
  | "settings";

export interface AuditChange {
  field_id: string;
  field_label: string;
  before: unknown;
  after: unknown;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  timestamp: string;

  // Who
  user_id: string;
  user_name: string;
  user_role: string;

  // What
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name?: string;

  // Changes (for updates)
  changes?: AuditChange[];

  // Snapshot (for deletes)
  snapshot?: object;
}
