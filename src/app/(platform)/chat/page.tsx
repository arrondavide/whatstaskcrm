"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, Plus, Hash, MessageSquare, Lock, Globe, Users,
  UserPlus, MoreVertical, Trash2, Pencil, X, Search,
} from "lucide-react";
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
  isPublic: boolean;
  createdBy: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage: { content: string; senderName: string; createdAt: string } | null;
};

type Message = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  readBy: string[];
  edited: boolean;
  deleted: boolean;
  createdAt: string;
};

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export default function ChatPage() {
  const { data: appData } = useAppUser();
  const qc = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPublic, setNewRoomPublic] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = appData?.user?.role === "admin";
  const currentUserId = appData?.user?.id;

  // Fetch team members
  const { data: teamUsers } = useQuery<TeamUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const d = await res.json();
      return (d.data ?? []).filter((u: TeamUser) => u.status === "active");
    },
  });

  // Fetch rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["chat-rooms"],
    queryFn: async () => {
      const res = await fetch("/api/chat");
      const d = await res.json();
      return d.data ?? [];
    },
    refetchInterval: 10000,
  });

  // Fetch messages for selected room
  const { data: messages } = useQuery<Message[]>({
    queryKey: ["chat-messages", selectedRoom],
    queryFn: async () => {
      const res = await fetch(`/api/chat/messages?roomId=${selectedRoom}`);
      const d = await res.json();
      return d.data ?? [];
    },
    enabled: !!selectedRoom,
    refetchInterval: 2000,
  });

  // Supabase Realtime for instant messages
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
          qc.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom, qc]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when room changes
  useEffect(() => {
    if (selectedRoom) inputRef.current?.focus();
  }, [selectedRoom]);

  const selectedRoomData = rooms?.find((r) => r.id === selectedRoom);
  const participantUsers = useMemo(() => {
    if (!selectedRoomData || !teamUsers) return [];
    return teamUsers.filter((u) => selectedRoomData.participants.includes(u.id));
  }, [selectedRoomData, teamUsers]);

  const filteredRooms = useMemo(() => {
    if (!rooms) return [];
    if (!roomSearch) return rooms;
    return rooms.filter((r) =>
      r.name?.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.lastMessage?.content.toLowerCase().includes(roomSearch.toLowerCase())
    );
  }, [rooms, roomSearch]);

  const totalUnread = rooms?.reduce((sum, r) => sum + r.unreadCount, 0) ?? 0;

  // ── Mutations ──

  const sendMsg = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: selectedRoom, content: message }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["chat-messages", selectedRoom] });
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createRoom = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName,
          type: "team",
          participants: selectedMembers,
          isPublic: newRoomPublic,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
      return d.data;
    },
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
      setSelectedRoom(room.id);
      setShowCreateRoom(false);
      setNewRoomName("");
      setSelectedMembers([]);
      setNewRoomPublic(false);
      toast.success("Group created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addMembers = useMutation({
    mutationFn: async (userIds: string[]) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: selectedRoom, userIds }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-rooms"] });
      setShowAddMembers(false);
      setSelectedMembers([]);
      toast.success("Members added");
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content, deleted }: { messageId: string; content?: string; deleted?: boolean }) => {
      const res = await fetch("/api/chat/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content, deleted }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", selectedRoom] });
      setEditingMessage(null);
      setEditContent("");
    },
  });

  // ── Helper: format time ──

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // ── Helper: get user initials color ──

  const getAvatarColor = (name: string) => {
    const colors = ["bg-violet-600", "bg-blue-600", "bg-green-600", "bg-amber-600", "bg-pink-600", "bg-cyan-600", "bg-red-600"];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-800">
      {/* ── Room List Sidebar ── */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <span className="font-semibold text-white">Messages</span>
            {totalUnread > 0 && (
              <span className="ml-2 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                {totalUnread}
              </span>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateRoom(true)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
              title="Create group"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-lg border border-gray-800 bg-gray-800/50 py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {roomsLoading ? (
            <div className="p-4 text-center text-xs text-gray-600">Loading...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-600">
              {isAdmin ? "Create a group to start chatting" : "No chat groups yet"}
            </div>
          ) : (
            filteredRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  selectedRoom === room.id
                    ? "bg-violet-600/10 border-l-2 border-violet-500"
                    : "hover:bg-gray-800/50 border-l-2 border-transparent"
                }`}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-400">
                  {room.isPublic ? <Globe size={16} /> : <Hash size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-white">{room.name ?? "Chat"}</span>
                    {room.lastMessage && (
                      <span className="ml-2 flex-shrink-0 text-[10px] text-gray-600">
                        {formatTime(room.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-gray-500">
                      {room.lastMessage
                        ? `${room.lastMessage.senderName}: ${room.lastMessage.content}`
                        : `${room.participants.length} members`}
                    </p>
                    {room.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Message Area ── */}
      <div className="flex flex-1 flex-col">
        {selectedRoom && selectedRoomData ? (
          <>
            {/* Room header */}
            <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-400">
                  {selectedRoomData.isPublic ? <Globe size={16} /> : <Lock size={14} />}
                </div>
                <div>
                  <span className="font-semibold text-white">#{selectedRoomData.name ?? "chat"}</span>
                  <p className="text-[11px] text-gray-500">{participantUsers.length} members</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={() => { setShowAddMembers(true); setSelectedMembers([]); }}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                    title="Add members"
                  >
                    <UserPlus size={16} />
                  </button>
                )}
                <button
                  onClick={() => setShowRoomInfo(!showRoomInfo)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                  title="Room info"
                >
                  <Users size={16} />
                </button>
              </div>
            </div>

            {/* Messages + optional info panel */}
            <div className="flex flex-1 overflow-hidden">
              {/* Messages */}
              <div className="flex flex-1 flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {messages?.map((msg, i) => {
                    const isMe = msg.senderId === currentUserId;
                    const prevMsg = messages[i - 1];
                    const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId ||
                      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000;
                    const isEditing = editingMessage === msg.id;

                    if (msg.deleted) {
                      return (
                        <div key={msg.id} className="px-12 py-0.5">
                          <p className="text-xs italic text-gray-600">Message deleted</p>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`group flex gap-3 ${showAvatar ? "mt-3" : ""} ${isMe ? "" : ""}`}>
                        {/* Avatar */}
                        <div className="w-8 flex-shrink-0">
                          {showAvatar && (
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(msg.senderName)}`}>
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {showAvatar && (
                            <div className="mb-0.5 flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{msg.senderName}</span>
                              <span className="text-[10px] text-gray-600">{formatTime(msg.createdAt)}</span>
                            </div>
                          )}

                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") editMessage.mutate({ messageId: msg.id, content: editContent });
                                  if (e.key === "Escape") { setEditingMessage(null); setEditContent(""); }
                                }}
                                className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => editMessage.mutate({ messageId: msg.id, content: editContent })}
                                className="text-xs text-violet-400 hover:text-violet-300"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingMessage(null); setEditContent(""); }}
                                className="text-xs text-gray-500 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1">
                              <p className="text-sm text-gray-200 leading-relaxed">
                                {msg.content}
                                {msg.edited && <span className="ml-1 text-[10px] text-gray-600">(edited)</span>}
                              </p>

                              {/* Message actions — show on hover */}
                              {(isMe || isAdmin) && (
                                <div className="ml-auto hidden flex-shrink-0 gap-0.5 group-hover:flex">
                                  {isMe && (
                                    <button
                                      onClick={() => { setEditingMessage(msg.id); setEditContent(msg.content); }}
                                      className="rounded p-1 text-gray-600 hover:bg-gray-800 hover:text-white"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm("Delete this message?")) {
                                        editMessage.mutate({ messageId: msg.id, deleted: true });
                                      }
                                    }}
                                    className="rounded p-1 text-gray-600 hover:bg-red-900/30 hover:text-red-400"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="border-t border-gray-800 bg-gray-900 p-3">
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMsg.mutate(); }}
                    className="flex gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message #${selectedRoomData.name ?? "chat"}...`}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || sendMsg.isPending}
                      className="rounded-lg bg-violet-600 px-4 py-2.5 text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Room info panel */}
              {showRoomInfo && (
                <div className="w-64 flex-shrink-0 border-l border-gray-800 bg-gray-900 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Members</h3>
                      <button onClick={() => setShowRoomInfo(false)} className="text-gray-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{participantUsers.length} members</p>

                    <div className="mt-4 space-y-1">
                      {participantUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-800">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(u.name)}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white">{u.name}</p>
                            <p className="text-[10px] text-gray-500">{u.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => { setShowAddMembers(true); setSelectedMembers([]); }}
                        className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-400 hover:border-violet-500 hover:text-violet-300"
                      >
                        <UserPlus size={14} />
                        Add members
                      </button>
                    )}

                    <div className="mt-4 border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-500">
                        {selectedRoomData.isPublic ? "Public — everyone can see" : "Private — invite only"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-700" />
              <h3 className="mt-4 text-lg font-medium text-gray-400">Select a conversation</h3>
              <p className="mt-1 text-sm text-gray-600">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Room Modal ── */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">Create Chat Group</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Group Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g., General, Sales Team"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRoomPublic}
                    onChange={(e) => setNewRoomPublic(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  <span className="text-sm text-gray-300">Public — everyone in the workspace can see</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Add Members</label>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-2">
                  {teamUsers?.filter((u) => u.id !== currentUserId).map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, u.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                          }
                        }}
                        className="rounded border-gray-600"
                      />
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white ${getAvatarColor(u.name)}`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-300">{u.name}</span>
                      <span className="ml-auto text-[10px] text-gray-500">{u.role}</span>
                    </label>
                  ))}
                </div>
                {selectedMembers.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{selectedMembers.length} selected</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreateRoom(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                Cancel
              </button>
              <button
                onClick={() => createRoom.mutate()}
                disabled={!newRoomName || createRoom.isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {createRoom.isPending ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Members Modal ── */}
      {showAddMembers && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">Add Members</h2>
            <div className="mt-4 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-2">
              {teamUsers
                ?.filter((u) => !selectedRoomData?.participants.includes(u.id))
                .map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers([...selectedMembers, u.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white ${getAvatarColor(u.name)}`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-300">{u.name}</span>
                  </label>
                ))}
              {teamUsers?.filter((u) => !selectedRoomData?.participants.includes(u.id)).length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-gray-500">All members are already in this group</p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowAddMembers(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                Cancel
              </button>
              <button
                onClick={() => addMembers.mutate(selectedMembers)}
                disabled={selectedMembers.length === 0 || addMembers.isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {addMembers.isPending ? "Adding..." : `Add ${selectedMembers.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
