"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  MoreHorizontal,
} from "lucide-react";
import type { ChatRoom, ChatMessage } from "@/types/chat";
import { timeAgo } from "@/utils/format";

export default function ChatPage() {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Fetch rooms and messages from Firestore with real-time listeners
  const rooms: ChatRoom[] = [];
  const messages: ChatMessage[] = [];

  function handleSendMessage() {
    if (!message.trim() || !selectedRoom) return;
    // TODO: Send message to Firestore
    setMessage("");
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Chat list */}
      <div className="flex w-80 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Chat</h2>
          <Button variant="ghost" size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start a chat with your team
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
                  selectedRoom?.id === room.id && "bg-accent"
                )}
              >
                <Avatar name={room.name || "Chat"} size="sm" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">
                    {room.name || "Direct Message"}
                  </p>
                  {room.last_message && (
                    <p className="truncate text-xs text-muted-foreground">
                      {room.last_message}
                    </p>
                  )}
                </div>
                {room.last_message_at && (
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(room.last_message_at)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {selectedRoom ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={selectedRoom.name || "Chat"} size="sm" />
                <div>
                  <p className="font-medium">
                    {selectedRoom.name || "Direct Message"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoom.participants.length} members
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <Avatar name={msg.sender_name} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {msg.sender_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(msg.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message input */}
            <div className="border-t border-border p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="Select a conversation"
            description="Choose a chat from the sidebar or start a new one"
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
