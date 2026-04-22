"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Users, FileText, Kanban, MessageSquare,
  Activity, Settings, ChevronLeft, ChevronRight, FileStack,
  Bell, ChevronsUpDown, Check, Plus,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import gsap from "gsap";

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

type Workspace = { tenantId: string; tenantName: string; role: string; userId: string };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { data } = useAppUser();
  const tenant = data?.tenant;
  const [showSwitcher, setShowSwitcher] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => { const res = await fetch("/api/auth/workspaces"); const d = await res.json(); return d.data ?? []; },
  });

  const hasMultipleWorkspaces = (workspaces?.length ?? 0) > 1;

  const switchWorkspace = (tenantId: string) => {
    setCookie("active_tenant_id", tenantId);
    setShowSwitcher(false);
    globalThis.location.assign("/dashboard");
  };

  useEffect(() => {
    if (!sidebarRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".nav-item", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, delay: 0.1, ease: "power2.out" });
    }, sidebarRef);
    return () => ctx.revert();
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className={cn("flex h-screen flex-col transition-all duration-300 ease-out", sidebarCollapsed ? "w-16" : "w-[260px]")}
      style={{ backgroundColor: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Workspace */}
      <div className="relative" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <button
          onClick={() => hasMultipleWorkspaces && setShowSwitcher(!showSwitcher)}
          className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors", hasMultipleWorkspaces ? "cursor-pointer hover:opacity-80" : "cursor-default")}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>
            {tenant?.name?.charAt(0).toUpperCase() ?? "W"}
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{tenant?.name ?? "Workspace"}</p>
                <p className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>{data?.user?.role}</p>
              </div>
              {hasMultipleWorkspaces && <ChevronsUpDown size={14} style={{ color: "var(--text-tertiary)" }} />}
            </>
          )}
        </button>

        {showSwitcher && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
            <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl py-1" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-primary)", boxShadow: "var(--shadow-xl)" }}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Workspaces</p>
              {workspaces?.map((ws) => {
                const isActive = ws.tenantId === tenant?.id;
                return (
                  <button key={ws.tenantId} onClick={() => !isActive && switchWorkspace(ws.tenantId)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:opacity-80"
                    style={{ color: isActive ? "var(--accent)" : "var(--text-primary)", backgroundColor: isActive ? "var(--accent-lighter)" : "transparent" }}>
                    <div className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>{ws.tenantName.charAt(0).toUpperCase()}</div>
                    <span className="flex-1 truncate">{ws.tenantName}</span>
                    {isActive && <Check size={14} />}
                  </button>
                );
              })}
              <div style={{ borderTop: "1px solid var(--border-primary)", margin: "4px 0" }} />
              <button onClick={() => { setShowSwitcher(false); router.push("/onboarding"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
                <div className="flex h-6 w-6 items-center justify-center rounded border border-dashed" style={{ borderColor: "var(--border-hover)" }}><Plus size={12} /></div>
                Create workspace
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end px-2 py-1.5">
        <button onClick={toggleSidebarCollapsed} className="rounded-md p-1 transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = item.dynamicLabel ? (tenant?.recordLabel ?? item.label) : item.label;
            return (
              <li key={item.href} className="nav-item">
                <Link href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150"
                  style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)", backgroundColor: isActive ? "var(--accent-light)" : "transparent" }}
                  title={sidebarCollapsed ? label : undefined}>
                  <item.icon size={18} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {!sidebarCollapsed && (
          <div className="mt-6 nav-item">
            <div className="flex items-center gap-2 px-3 py-2">
              <Settings size={14} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Settings</span>
            </div>
            <ul className="space-y-0.5">
              {settingsItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href}
                      className="block rounded-lg px-3 py-2 pl-9 text-sm transition-all duration-150"
                      style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)", backgroundColor: isActive ? "var(--accent-light)" : "transparent" }}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {!sidebarCollapsed && data?.user && (
        <div className="p-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white" style={{ backgroundColor: "var(--accent)" }}>
              {data.user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>{data.user.name}</p>
              <p className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>{data.user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
