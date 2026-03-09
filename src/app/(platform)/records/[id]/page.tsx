"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { RecordForm } from "@/components/records/record-form";
import { useTenantStore } from "@/stores/tenant-store";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Clock,
  User,
} from "lucide-react";
import { timeAgo } from "@/utils/format";
import type { Field } from "@/types/field";

export default function RecordDetailPage() {
  const router = useRouter();
  const { tenant, fields } = useTenantStore();
  const [editing, setEditing] = useState(false);
  const singularLabel = tenant?.record_label_singular || "Record";

  // TODO: Fetch record from Firestore by ID
  // For now, showing placeholder structure

  return (
    <Shell
      title={singularLabel}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {field.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      No data yet
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Created by —</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created —</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No changes recorded yet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title={`Edit ${singularLabel}`}
        size="lg"
      >
        <RecordForm
          onSubmit={async () => setEditing(false)}
          onCancel={() => setEditing(false)}
          submitLabel="Save Changes"
        />
      </Modal>
    </Shell>
  );
}
