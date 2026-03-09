"use client";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_PERMISSIONS } from "@/types/user";
import type { UserRole } from "@/types/user";

const roles: { role: UserRole; description: string }[] = [
  { role: "admin", description: "Full access to everything" },
  { role: "manager", description: "Can manage records and view activity" },
  { role: "employee", description: "Can create and edit records" },
  { role: "viewer", description: "Read-only access" },
];

const permissionLabels: Record<string, Record<string, string>> = {
  records: {
    create: "Create records",
    read: "View records",
    update: "Edit records",
    delete: "Delete records",
    export: "Export records",
    view_sensitive: "View sensitive fields",
  },
  employees: {
    invite: "Invite employees",
    remove: "Remove employees",
    change_role: "Change roles",
    view_activity: "View activity log",
  },
  chat: {
    send: "Send messages",
    delete_own: "Delete own messages",
    view_logs: "View chat logs",
  },
  settings: {
    edit_fields: "Edit fields",
    edit_branding: "Edit branding",
    edit_templates: "Edit templates",
    manage_views: "Manage views",
  },
};

export default function RolesSettingsPage() {
  return (
    <Shell
      title="Roles & Permissions"
      description="View and manage role permissions"
    >
      <div className="space-y-6">
        {roles.map(({ role, description }) => {
          const perms = DEFAULT_PERMISSIONS[role];
          return (
            <Card key={role}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base capitalize">{role}</CardTitle>
                  <Badge variant="outline">{description}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {Object.entries(permissionLabels).map(([group, items]) => (
                    <div key={group}>
                      <h4 className="mb-3 text-sm font-medium capitalize text-muted-foreground">
                        {group}
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(items).map(([key, label]) => {
                          const enabled =
                            perms[group as keyof typeof perms]?.[
                              key as keyof (typeof perms)[keyof typeof perms]
                            ] ?? false;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm">{label}</span>
                              <Switch
                                checked={enabled}
                                onChange={() => {}}
                                disabled
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}
