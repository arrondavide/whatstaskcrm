export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  permissions: {
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
  };
  created_at: string;
}
