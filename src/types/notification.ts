export type NotificationType =
  | "record_assigned"
  | "record_updated"
  | "record_deleted"
  | "mention_in_chat"
  | "employee_invited"
  | "export_ready"
  | "system_announcement";

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: {
    entity_type: string;
    entity_id: string;
  };
  read: boolean;
  created_at: string;
}
