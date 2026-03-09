"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTenantStore } from "@/stores/tenant-store";
import toast from "react-hot-toast";

export default function GeneralSettingsPage() {
  const { tenant } = useTenantStore();
  const [companyName, setCompanyName] = useState(tenant?.branding.name || "");
  const [recordLabel, setRecordLabel] = useState(tenant?.record_label || "Records");
  const [recordLabelSingular, setRecordLabelSingular] = useState(
    tenant?.record_label_singular || "Record"
  );
  const [documentLabel, setDocumentLabel] = useState(
    tenant?.document_label || "Documents"
  );
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      // TODO: Update tenant in Firestore
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="Settings" description="Manage your workspace settings">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Labels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Customize how things are labeled in your workspace
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Record Label (plural)</Label>
                <Input
                  value={recordLabel}
                  onChange={(e) => setRecordLabel(e.target.value)}
                  placeholder="e.g. Candidates, Leads, Properties"
                />
              </div>
              <div className="space-y-2">
                <Label>Record Label (singular)</Label>
                <Input
                  value={recordLabelSingular}
                  onChange={(e) => setRecordLabelSingular(e.target.value)}
                  placeholder="e.g. Candidate, Lead, Property"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Document Label</Label>
              <Input
                value={documentLabel}
                onChange={(e) => setDocumentLabel(e.target.value)}
                placeholder="e.g. Certificates, Contracts, Proposals"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={loading}>
            Save Changes
          </Button>
        </div>
      </div>
    </Shell>
  );
}
