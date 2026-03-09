"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, Search, Filter } from "lucide-react";
import { timeAgo } from "@/utils/format";
import type { AuditLog, AuditAction } from "@/types/audit";

const actionLabels: Partial<Record<AuditAction, string>> = {
  RECORD_CREATED: "created a record",
  RECORD_UPDATED: "updated a record",
  RECORD_DELETED: "deleted a record",
  RECORD_RESTORED: "restored a record",
  FILE_UPLOADED: "uploaded a file",
  FILE_DOWNLOADED: "downloaded a file",
  EMPLOYEE_INVITED: "invited an employee",
  EMPLOYEE_REMOVED: "removed an employee",
  EMPLOYEE_ROLE_CHANGED: "changed a role",
  CERTIFICATE_EXPORTED: "exported a certificate",
  LOGIN: "logged in",
  FIELD_CREATED: "created a field",
  FIELD_UPDATED: "updated a field",
  FIELD_DELETED: "deleted a field",
  SETTINGS_CHANGED: "changed settings",
};

const actionColors: Partial<Record<AuditAction, "default" | "success" | "destructive" | "warning" | "secondary">> = {
  RECORD_CREATED: "success",
  RECORD_UPDATED: "warning",
  RECORD_DELETED: "destructive",
  EMPLOYEE_INVITED: "default",
  EMPLOYEE_REMOVED: "destructive",
};

export default function ActivityPage() {
  const [filterAction, setFilterAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Fetch audit logs from Firestore
  const logs: AuditLog[] = [];

  return (
    <Shell
      title="Activity Log"
      description="Track every action in your workspace"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          options={[
            { value: "", label: "All actions" },
            { value: "RECORD_CREATED", label: "Record created" },
            { value: "RECORD_UPDATED", label: "Record updated" },
            { value: "RECORD_DELETED", label: "Record deleted" },
            { value: "EMPLOYEE_INVITED", label: "Employee invited" },
            { value: "EMPLOYEE_REMOVED", label: "Employee removed" },
            { value: "CERTIFICATE_EXPORTED", label: "Certificate exported" },
            { value: "LOGIN", label: "Login" },
          ]}
          className="w-48"
        />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-12 w-12" />}
          title="No activity yet"
          description="Actions from your team will appear here"
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <Avatar name={log.user_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{log.user_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {actionLabels[log.action] || log.action}
                    </span>
                    {log.entity_name && (
                      <span className="text-sm font-medium">
                        {log.entity_name}
                      </span>
                    )}
                    <Badge variant={actionColors[log.action] || "secondary"} className="text-xs">
                      {log.entity_type}
                    </Badge>
                  </div>

                  {/* Show changes for updates */}
                  {log.changes && log.changes.length > 0 && (
                    <div className="mt-2 rounded-md bg-muted p-3 text-xs">
                      {log.changes.map((change, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {change.field_label}:
                          </span>
                          <span className="line-through text-destructive">
                            {String(change.before)}
                          </span>
                          <span>→</span>
                          <span className="text-success">
                            {String(change.after)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(log.timestamp)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}
