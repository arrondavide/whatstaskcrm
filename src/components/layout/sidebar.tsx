"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Database,
  MessageSquare,
  FileText,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Kanban,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useTenantStore } from "@/stores/tenant-store";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { tenant } = useTenantStore();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    },
    {
      label: tenant?.record_label || "Records",
      href: "/records",
      icon: <Database className="h-[18px] w-[18px]" />,
    },
    {
      label: "Pipeline",
      href: "/pipeline",
      icon: <Kanban className="h-[18px] w-[18px]" />,
    },
    {
      label: "Employees",
      href: "/employees",
      icon: <Users className="h-[18px] w-[18px]" />,
    },
    {
      label: "Chat",
      href: "/chat",
      icon: <MessageSquare className="h-[18px] w-[18px]" />,
    },
    {
      label: tenant?.document_label || "Documents",
      href: "/templates",
      icon: <FileText className="h-[18px] w-[18px]" />,
    },
    {
      label: "Activity",
      href: "/activity",
      icon: <Activity className="h-[18px] w-[18px]" />,
      permission: "employees.view_activity",
    },
    {
      label: "Settings",
      href: "/settings/general",
      icon: <Settings className="h-[18px] w-[18px]" />,
    },
  ];

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border/50 px-4">
        {tenant?.branding.logo_url ? (
          <img
            src={tenant.branding.logo_url}
            alt={tenant.branding.name}
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: tenant?.branding.primary_color || "hsl(252 87% 64%)" }}
          >
            {tenant?.branding.name?.[0] || "C"}
          </div>
        )}
        {!collapsed && (
          <span className="truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">
            {tenant?.branding.name || "CRM WhatsTask"}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} content={item.label} side="right">
                {link}
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name || "User"} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.role}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-9 items-center justify-center border-t border-sidebar-border/50 text-muted-foreground/50 hover:text-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
