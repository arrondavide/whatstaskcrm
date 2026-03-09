"use client";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantStore } from "@/stores/tenant-store";
import { Database, Users, FileText, Activity } from "lucide-react";

const stats = [
  {
    label: "Total Records",
    value: "0",
    icon: <Database className="h-5 w-5" />,
    change: "Get started by adding your first record",
  },
  {
    label: "Team Members",
    value: "1",
    icon: <Users className="h-5 w-5" />,
    change: "Invite your team to collaborate",
  },
  {
    label: "Documents",
    value: "0",
    icon: <FileText className="h-5 w-5" />,
    change: "Set up your document templates",
  },
  {
    label: "Activity Today",
    value: "0",
    icon: <Activity className="h-5 w-5" />,
    change: "Actions will appear here",
  },
];

export default function DashboardPage() {
  const { tenant } = useTenantStore();

  return (
    <Shell
      title="Dashboard"
      description={`Welcome to ${tenant?.branding.name || "your workspace"}`}
    >
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className="text-muted-foreground">{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No activity yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Actions from your team will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <QuickAction
                icon={<Database className="h-4 w-4" />}
                label={`Add ${tenant?.record_label_singular || "Record"}`}
                href="/records"
              />
              <QuickAction
                icon={<Users className="h-4 w-4" />}
                label="Invite Team Member"
                href="/employees"
              />
              <QuickAction
                icon={<FileText className="h-4 w-4" />}
                label="Create Template"
                href="/templates"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:bg-accent"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span>{label}</span>
    </a>
  );
}
