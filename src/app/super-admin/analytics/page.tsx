"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Platform usage and growth metrics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analytics will be available once tenants start using the platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
