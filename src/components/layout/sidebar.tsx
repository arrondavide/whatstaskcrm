"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Kanban,
  MessageSquare,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Bell,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function setCookie(name: string, value: string) {
  globalThis.document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Records", href: "/records", icon: FileText, dynamicLabel: true },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Team", href: "/employees", icon: Users },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Templates", href: "/templates", icon: FileStack },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

const settingsItems = [
  { label: "General", href: "/settings/general" },
  { label: "Fields", href: "/settings/fields" },
  { label: "Branding", href: "/settings/branding" },
  { label: "Roles", href: "/settings/roles" },
];

type Workspace = {
  tenantId: string;
  tenantName: string;
  role: string;
  userId: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { data } = useAppUser();
  const tenant = data?.tenant;
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Fetch all workspaces this user belongs to
  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch("/api/auth/workspaces");
      const d = await res.json();
      return d.data ?? [];
    },
  });

  const hasMultipleWorkspaces = (workspaces?.length ?? 0) > 1;

  const switchWorkspace = (tenantId: string) => {
    setCookie("active_tenant_id", tenantId);
    setShowSwitcher(false);
    // Full reload to refetch everything with new tenant context
    globalThis.location.assign("/dashboard");
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Workspace switcher */}
      <div className="relative border-b border-gray-800">
        <button
          onClick={() => hasMultipleWorkspaces && setShowSwitcher(!showSwitcher)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
            hasMultipleWorkspaces ? "hover:bg-gray-800 cursor-pointer" : "cursor-default"
          )}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            {tenant?.name?.charAt(0).toUpperCase() ?? "W"}
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {tenant?.name ?? "Workspace"}
                </p>
                <p className="truncate text-[11px] text-gray-500">
                  {data?.user?.role ?? "member"}
                </p>
              </div>
              {hasMultipleWorkspaces && (
                <ChevronsUpDown size={14} className="flex-shrink-0 text-gray-500" />
              )}
            </>
          )}
        </button>

        {/* Workspace dropdown */}
        {showSwitcher && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
            <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Workspaces
              </p>
              {workspaces?.map((ws) => {
                const isActive = ws.tenantId === tenant?.id;
                return (
                  <button
                    key={ws.tenantId}
                    onClick={() => !isActive && switchWorkspace(ws.tenantId)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                      isActive ? "bg-violet-600/10 text-violet-400" : "text-gray-300 hover:bg-gray-700"
                    )}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white">
                      {ws.tenantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{ws.tenantName}</p>
                      <p className="text-[10px] text-gray-500">{ws.role}</p>
                    </div>
                    {isActive && <Check size={14} className="flex-shrink-0 text-violet-400" />}
                  </button>
                );
              })}
              <div className="my-1 border-t border-gray-700" />
              <button
                onClick={() => { setShowSwitcher(false); router.push("/onboarding"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-gray-600">
                  <Plus size={12} />
                </div>
                Create new workspace
              </button>
            </div>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="flex justify-end px-2 py-1">
        <button
          onClick={toggleSidebarCollapsed}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = item.dynamicLabel ? (tenant?.recordLabel ?? item.label) : item.label;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-600/20 text-violet-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <item.icon size={20} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Settings section */}
        {!sidebarCollapsed && (
          <div className="mt-6">
            <div className="flex items-center gap-2 px-3 py-2">
              <Settings size={16} className="text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Settings
              </span>
            </div>
            <ul className="space-y-1">
              {settingsItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-lg px-3 py-2 pl-10 text-sm transition-colors",
                        isActive
                          ? "bg-violet-600/20 text-violet-400"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* User section */}
      {!sidebarCollapsed && data?.user && (
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
              {data.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{data.user.name}</p>
              <p className="truncate text-xs text-gray-400">{data.user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
