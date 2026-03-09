"use client";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenantStore } from "@/stores/tenant-store";

export default function BillingSettingsPage() {
  const { tenant } = useTenantStore();

  const status = tenant?.subscription.status || "free";

  return (
    <Shell title="Billing" description="Manage your subscription">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant={status === "active" ? "success" : "secondary"} className="text-sm">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {status === "free"
                ? "You are currently on the free plan. Contact the platform admin for subscription options."
                : status === "trial"
                ? `Your trial ends on ${tenant?.subscription.trial_end_date || "—"}`
                : "Your subscription is active."}
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
