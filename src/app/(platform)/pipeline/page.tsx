"use client";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Kanban } from "lucide-react";
import { useTenantStore } from "@/stores/tenant-store";
import { useRecordStore } from "@/stores/record-store";
import { cn } from "@/utils/cn";

const defaultStages = [
  { id: "new", label: "New", color: "hsl(var(--muted-foreground))" },
  { id: "in_progress", label: "In Progress", color: "hsl(var(--primary))" },
  { id: "review", label: "Review", color: "hsl(var(--warning))" },
  { id: "done", label: "Done", color: "hsl(var(--success))" },
];

export default function PipelinePage() {
  const { tenant } = useTenantStore();
  const { records } = useRecordStore();

  const activeRecords = records.filter((r) => !r.meta.deleted);

  // Group records by pipeline stage
  const stages = defaultStages;
  const grouped = stages.map((stage) => ({
    ...stage,
    records: activeRecords.filter(
      (r) => r.meta.pipeline_stage === stage.id
    ),
  }));

  return (
    <Shell
      title="Pipeline"
      description="Visualize your workflow stages"
    >
      {activeRecords.length === 0 ? (
        <EmptyState
          icon={<Kanban className="h-12 w-12" />}
          title="No records in pipeline"
          description="Add records and assign them to pipeline stages"
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map((stage) => (
            <div key={stage.id} className="min-w-[280px] flex-1">
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stage.records.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {stage.records.map((record) => (
                  <Card
                    key={record.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">
                        {String(Object.values(record.data)[0] || "Untitled")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Object.keys(record.data).length} fields
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {stage.records.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No records
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
