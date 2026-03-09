export type UserRole = "admin" | "manager" | "employee" | "viewer";

export type UserStatus = "active" | "invited" | "suspended";

export interface UserPermissions {
  records: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    export: boolean;
    view_sensitive: boolean;
  };
  employees: {
    invite: boolean;
    remove: boolean;
    change_role: boolean;
    view_activity: boolean;
  };
  chat: {
    send: boolean;
    delete_own: boolean;
    view_logs: boolean;
  };
  settings: {
    edit_fields: boolean;
    edit_branding: boolean;
    edit_templates: boolean;
    manage_views: boolean;
  };
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  last_active?: string;
  created_at: string;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    records: { create: true, read: true, update: true, delete: true, export: true, view_sensitive: true },
    employees: { invite: true, remove: true, change_role: true, view_activity: true },
    chat: { send: true, delete_own: true, view_logs: true },
    settings: { edit_fields: true, edit_branding: true, edit_templates: true, manage_views: true },
  },
  manager: {
    records: { create: true, read: true, update: true, delete: true, export: true, view_sensitive: true },
    employees: { invite: true, remove: false, change_role: false, view_activity: true },
    chat: { send: true, delete_own: true, view_logs: false },
    settings: { edit_fields: false, edit_branding: false, edit_templates: true, manage_views: true },
  },
  employee: {
    records: { create: true, read: true, update: true, delete: false, export: true, view_sensitive: false },
    employees: { invite: false, remove: false, change_role: false, view_activity: false },
    chat: { send: true, delete_own: true, view_logs: false },
    settings: { edit_fields: false, edit_branding: false, edit_templates: false, manage_views: false },
  },
  viewer: {
    records: { create: false, read: true, update: false, delete: false, export: false, view_sensitive: false },
    employees: { invite: false, remove: false, change_role: false, view_activity: false },
    chat: { send: false, delete_own: false, view_logs: false },
    settings: { edit_fields: false, edit_branding: false, edit_templates: false, manage_views: false },
  },
};
