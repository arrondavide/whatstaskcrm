"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Search,
  Building2,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Users,
  Database,
} from "lucide-react";
import type { TenantWithStats, SubscriptionStatus } from "@/types/tenant";

const statusColors: Record<SubscriptionStatus, "success" | "warning" | "destructive" | "secondary"> = {
  free: "secondary",
  trial: "warning",
  active: "success",
  suspended: "destructive",
};

export default function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Fetch tenants from Firestore
  const tenants: TenantWithStats[] = [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage all registered companies
          </p>
        </div>
      </div>

      <div className="mb-4 relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12" />}
          title="No tenants yet"
          description="Companies will appear here when they sign up"
        />
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-white"
                    style={{
                      backgroundColor: tenant.branding.primary_color,
                    }}
                  >
                    {tenant.branding.name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{tenant.branding.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tenant.user_count} users
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {tenant.record_count} records
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={statusColors[tenant.subscription.status]}>
                    {tenant.subscription.status}
                  </Badge>
                  <Dropdown
                    trigger={
                      <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    }
                  >
                    <DropdownItem>
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownItem>
                    <DropdownItem>
                      <Pause className="mr-2 h-4 w-4" />
                      Suspend
                    </DropdownItem>
                    <DropdownItem destructive>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownItem>
                  </Dropdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
