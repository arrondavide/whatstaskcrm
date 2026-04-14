"use client";

import { Search, Bell, LogOut, Menu, MessageSquare, UserPlus, FileText, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useUIStore } from "@/stores/ui-store";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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

const notifIcons: Record<string, typeof Bell> = {
  chat_message: MessageSquare,
  chat_added: UserPlus,
  record_assigned: FileText,
  role_changed: Settings,
};

export function Topbar() {
  const { signOut } = useAuth();
  const { data: appData } = useAppUser();
  const { toggleSidebar } = useUIStore();
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  // Fetch notifications
  const { data: notifData } = useQuery<{ items: NotificationItem[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const d = await res.json();
      return d.data ?? { items: [], unreadCount: 0 };
    },
    refetchInterval: 15000,
  });

  // Supabase Realtime for instant notifications
  useEffect(() => {
    if (!appData?.user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${appData.user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appData?.user?.id, qc]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.items?.slice(0, 10) ?? [];

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-gray-400 hover:text-white md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-64 rounded-lg border border-gray-700 bg-gray-800 py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
                  <h3 className="font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = notifIcons[n.type] ?? Bell;
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            setShowNotifs(false);
                            if (n.link) router.push(n.link);
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-700/50 ${
                            !n.read ? "bg-violet-600/5" : ""
                          }`}
                        >
                          <div className={`mt-0.5 rounded-full p-1.5 ${!n.read ? "bg-violet-900/30" : "bg-gray-700"}`}>
                            <Icon size={12} className={!n.read ? "text-violet-400" : "text-gray-500"} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${!n.read ? "text-white font-medium" : "text-gray-300"}`}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="mt-0.5 truncate text-xs text-gray-500">{n.body}</p>
                            )}
                            <p className="mt-0.5 text-[10px] text-gray-600">{formatTime(n.createdAt)}</p>
                          </div>
                          {!n.read && (
                            <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-violet-400" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-gray-700">
                  <button
                    onClick={() => { setShowNotifs(false); router.push("/notifications"); }}
                    className="w-full px-4 py-2.5 text-center text-xs text-violet-400 hover:bg-gray-700/50 hover:text-violet-300"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">
              {appData?.user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                <div className="border-b border-gray-700 px-3 py-2">
                  <p className="text-sm font-medium text-white">{appData?.user?.name}</p>
                  <p className="text-xs text-gray-400">{appData?.user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
