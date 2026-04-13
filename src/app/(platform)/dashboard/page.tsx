"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/queries/use-auth";
import { FileText, Users, Bell, Activity, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

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
  "field.created": "created a field",
  "invite.created": "sent an invite",
  "tenant.updated": "updated settings",
};

export default function DashboardPage() {
  const { data: appData } = useAppUser();
  const tenant = appData?.tenant;

  const { data } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      return json.data;
    },
  });

  const stats = [
    {
      label: `Total ${tenant?.recordLabel ?? "Records"}`,
      value: data?.stats.totalRecords ?? 0,
      icon: FileText,
      color: "text-violet-400",
      bg: "bg-violet-900/20",
      href: "/records",
    },
    {
      label: "Team Members",
      value: data?.stats.activeUsers ?? 0,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-900/20",
      href: "/employees",
    },
    {
      label: "Unread Notifications",
      value: data?.stats.unreadNotifications ?? 0,
      icon: Bell,
      color: "text-amber-400",
      bg: "bg-amber-900/20",
      href: "/notifications",
    },
    {
      label: "Plan",
      value: (tenant?.plan ?? "free").charAt(0).toUpperCase() + (tenant?.plan ?? "free").slice(1),
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-900/20",
      href: "/settings/billing",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400">Welcome to {tenant?.name ?? "your workspace"}</p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <ArrowRight size={16} className="text-gray-700 transition-colors group-hover:text-gray-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="font-semibold text-white">Recent Activity</h2>
          <Link href="/activity" className="text-sm text-violet-400 hover:text-violet-300">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {!data?.recentActivity?.length ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              No activity yet. Start by creating fields and records.
            </div>
          ) : (
            data.recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <div className="rounded-md bg-gray-800 p-1.5">
                  <Activity size={14} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">{item.userName}</span>{" "}
                    {actionLabels[item.action] ?? item.action}
                  </p>
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
