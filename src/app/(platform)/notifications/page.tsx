"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  actorName: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ items: NotificationItem[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      return json.data ?? { items: [], unreadCount: 0 };
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", { method: "PATCH" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read");
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-gray-400">{data?.unreadCount ?? 0} unread</p>
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : !data?.items.length ? (
          <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center">
            <Bell size={40} className="mx-auto text-gray-700" />
            <p className="mt-3 text-gray-400">No notifications yet</p>
          </div>
        ) : (
          data.items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg p-3 ${
                n.read ? "" : "bg-gray-900/50"
              }`}
            >
              <div className={`mt-0.5 rounded-full p-1 ${n.read ? "bg-gray-800" : "bg-violet-900/30"}`}>
                <Bell size={14} className={n.read ? "text-gray-500" : "text-violet-400"} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-gray-400">{n.body}</p>}
                <p className="mt-1 text-[10px] text-gray-600">
                  {n.actorName && `${n.actorName} · `}
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && <div className="mt-2 h-2 w-2 rounded-full bg-violet-400" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
