export type ChatRoomType = "direct" | "group";

export type MessageType = "text" | "file" | "system";

export interface ChatRoom {
  id: string;
  tenant_id: string;
  name?: string;
  type: ChatRoomType;
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  created_by: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  type: MessageType;
  file_url?: string;
  file_name?: string;
  read_by: string[];
  created_at: string;
}
