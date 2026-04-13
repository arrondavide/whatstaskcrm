"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Plus, Hash, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { useAppUser } from "@/hooks/queries/use-auth";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

type Room = {
  id: string;
  type: string;
  name: string | null;
  participants: string[];
  lastMessageAt: string | null;
};

type Message = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
};

export default function ChatPage() {
  const { user } = useAuth();
  const { data: appData } = useAppUser();
  const qc = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rooms
  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["chat-rooms"],
    queryFn: async () => {
      const res = await fetch("/api/chat");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  // Messages for selected room
  const { data: messages } = useQuery<Message[]>({
    queryKey: ["chat-messages", selectedRoom],
    queryFn: async () => {
      const res = await fetch(`/api/chat/messages?roomId=${selectedRoom}`);
      const data = await res.json();
      return data.data ?? [];
    },
    enabled: !!selectedRoom,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Supabase Realtime subscription
  useEffect(() => {
    if (!selectedRoom) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`room-${selectedRoom}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${selectedRoom}` },
        () => {
          qc.invalidateQueries({ queryKey: ["chat-messages", selectedRoom] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: selectedRoom, content: message }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["chat-messages", selectedRoom] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "team", name: newRoomName, participants: [] }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
      setSelectedRoom(room.id);
      setShowCreateRoom(false);
      setNewRoomName("");
    },
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-800">
      {/* Rooms sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 p-3">
          <span className="font-semibold text-white">Channels</span>
          <button
            onClick={() => setShowCreateRoom(true)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {rooms?.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selectedRoom === room.id
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Hash size={16} />
              <span className="truncate">{room.name ?? "Direct"}</span>
            </button>
          ))}
          {(!rooms || rooms.length === 0) && (
            <p className="px-3 py-4 text-xs text-gray-600">No channels yet. Create one to start chatting.</p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex flex-1 flex-col">
        {selectedRoom ? (
          <>
            <div className="border-b border-gray-800 bg-gray-900 px-4 py-3">
              <span className="font-medium text-white">
                # {rooms?.find((r) => r.id === selectedRoom)?.name ?? "Chat"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages?.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-md rounded-lg px-3 py-2 ${isMe ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-200"}`}>
                      {!isMe && (
                        <p className="mb-1 text-xs font-medium text-violet-400">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`mt-1 text-[10px] ${isMe ? "text-violet-200" : "text-gray-500"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-gray-800 bg-gray-900 p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMessage.mutate(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto text-gray-700" />
              <p className="mt-3 text-gray-500">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Create room modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">New Channel</h2>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Channel name"
              className="mt-4 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowCreateRoom(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button
                onClick={() => createRoom.mutate()}
                disabled={!newRoomName || createRoom.isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
