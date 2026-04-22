"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useFields } from "@/hooks/queries/use-fields";
import {
  FileText, Users, Bell, Activity, TrendingUp, ArrowRight,
  ArrowUpRight, Calendar, Clock, Zap,
} from "lucide-react";
import Link from "next/link";
import gsap from "gsap";

type DashboardData = {
  stats: {
    totalRecords: number;
    activeUsers: number;
    unreadNotifications: number;
  };
  recentActivity: {
    id: string;
    userName: string;
    action: string;
    entityType: string;
    entityName: string | null;
    createdAt: string;
  }[];
};

const actionLabels: Record<string, string> = {
  "record.created": "created a record",
  "record.updated": "updated a record",
  "record.deleted": "deleted a record",
  "record.imported": "imported records",
  "record.merged": "merged records",
  "field.created": "created a field",
  "field.updated": "updated a field",
  "field.deleted": "deleted a field",
  "invite.created": "sent an invite",
  "invite.accepted": "joined the workspace",
  "tenant.updated": "updated settings",
  "user.role_changed": "changed a user role",
  "user.removed": "removed a user",
};

export default function DashboardPage() {
  const { data: appData } = useAppUser();
  const { data: fieldsData } = useFields();
  const tenant = appData?.tenant;
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      return json.data;
    },
  });

  // ── GSAP Entrance Animations ──
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Greeting
      gsap.fromTo(
        ".dash-greeting",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
      );

      // Stat cards — stagger in
      gsap.fromTo(
        ".dash-stat",
        { opacity: 0, y: 24, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, delay: 0.2, ease: "power3.out" }
      );

      // Quick actions
      gsap.fromTo(
        ".dash-quick-action",
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, delay: 0.5, ease: "power3.out" }
      );

      // Activity section
      gsap.fromTo(
        ".dash-activity",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.6, ease: "power3.out" }
      );

      // Activity items stagger
      gsap.fromTo(
        ".dash-activity-item",
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, delay: 0.8, ease: "power2.out" }
      );

      // Count up stat numbers
      document.querySelectorAll("[data-count]").forEach((el) => {
        const target = Number(el.getAttribute("data-count") ?? 0);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.2,
          delay: 0.4,
          ease: "power2.out",
          onUpdate: () => {
            (el as HTMLElement).textContent = Math.round(obj.val).toLocaleString();
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [data]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const stats = [
    {
      label: `Total ${tenant?.recordLabel ?? "Records"}`,
      value: data?.stats.totalRecords ?? 0,
      icon: FileText,
      gradient: "from-violet-500/20 to-purple-500/20",
      iconColor: "text-violet-400",
      href: "/records",
    },
    {
      label: "Team Members",
      value: data?.stats.activeUsers ?? 0,
      icon: Users,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      href: "/employees",
    },
    {
      label: "Unread Notifications",
      value: data?.stats.unreadNotifications ?? 0,
      icon: Bell,
      gradient: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
      href: "/notifications",
    },
    {
      label: "Custom Fields",
      value: fieldsData?.length ?? 0,
      icon: Zap,
      gradient: "from-emerald-500/20 to-green-500/20",
      iconColor: "text-emerald-400",
      href: "/settings/fields",
    },
  ];

  const quickActions = [
    { label: `New ${tenant?.recordLabelSingular ?? "Record"}`, href: "/records", icon: FileText },
    { label: "Invite Member", href: "/employees", icon: Users },
    { label: "View Pipeline", href: "/pipeline", icon: TrendingUp },
    { label: "Open Chat", href: "/chat", icon: Activity },
  ];

  return (
    <div ref={containerRef} className="mx-auto max-w-6xl">
      {/* ── Greeting ── */}
      <div className="dash-greeting mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {getGreeting()}, {appData?.user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-base" style={{ color: "var(--text-secondary)" }}>
          Here&apos;s what&apos;s happening in {tenant?.name ?? "your workspace"}
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="dash-stat group relative overflow-hidden rounded-xl border p-5 transition-all duration-200 hover:shadow-lg"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-primary)",
            }}
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-lg p-2" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                  <stat.icon size={20} className={stat.iconColor} />
                </div>
                <ArrowUpRight
                  size={16}
                  className="opacity-0 transition-all duration-200 group-hover:opacity-100"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </div>
              <p
                className="mt-4 text-3xl font-bold"
                data-count={stat.value}
                style={{ color: "var(--text-primary)" }}
              >
                0
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                {stat.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Quick Actions ── */}
        <div className="lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="dash-quick-action flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-primary)",
                }}
              >
                <div className="rounded-lg p-2" style={{ backgroundColor: "var(--accent-light)" }}>
                  <action.icon size={16} style={{ color: "var(--accent)" }} />
                </div>
                <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {action.label}
                </span>
                <ArrowRight size={14} style={{ color: "var(--text-tertiary)" }} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="dash-activity lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Recent Activity
            </h2>
            <Link href="/activity" className="text-xs font-medium hover:opacity-80" style={{ color: "var(--accent)" }}>
              View all
            </Link>
          </div>

          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-primary)" }}
          >
            {!data?.recentActivity?.length ? (
              <div className="px-5 py-12 text-center">
                <Activity size={32} className="mx-auto mb-3" style={{ color: "var(--text-disabled)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  No activity yet. Start by creating fields and records.
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border-secondary)" }}>
                {data.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="dash-activity-item flex items-center gap-3 px-5 py-3.5 transition-colors duration-150"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}>
                      {item.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                        <span className="font-semibold">{item.userName}</span>{" "}
                        <span style={{ color: "var(--text-secondary)" }}>
                          {actionLabels[item.action] ?? item.action}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                      <Clock size={12} />
                      <span className="text-xs whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
