"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useAppUser } from "@/hooks/queries/use-auth";
import { cn } from "@/lib/utils";

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
  { label: "Billing", href: "/settings/billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { data } = useAppUser();
  const tenant = data?.tenant;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Tenant Name */}
      <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
        {!sidebarCollapsed && (
          <span className="truncate text-lg font-bold text-white">
            {tenant?.name ?? "CRM WhatsTask"}
          </span>
        )}
        <button
          onClick={toggleSidebarCollapsed}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
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
