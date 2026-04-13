"use client";

import { useState } from "react";
import { Plus, GripVertical } from "lucide-react";
import { useRecords, useUpdateRecord } from "@/hooks/queries/use-records";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useFields } from "@/hooks/queries/use-fields";

export default function PipelinePage() {
  const { data: appData } = useAppUser();
  const { data: fields } = useFields();
  const updateRecord = useUpdateRecord();
  const tenant = appData?.tenant;
  const stages = tenant?.pipelineConfig?.stages ?? [];

  // Show setup message if pipeline not configured
  if (!tenant?.pipelineConfig?.enabled || stages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <div className="mt-8 rounded-xl border border-dashed border-gray-700 py-16 text-center">
          <p className="text-lg text-gray-400">Pipeline is not configured yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Go to Settings → General to enable the pipeline and add stages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages
          .sort((a, b) => a.order - b.order)
          .map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              fields={fields ?? []}
              onMoveRecord={(recordId, stageId) => {
                updateRecord.mutate({ id: recordId, pipelineStage: stageId });
              }}
            />
          ))}
      </div>
    </div>
  );
}

function PipelineColumn({
  stage,
  fields,
  onMoveRecord,
}: {
  stage: { id: string; name: string; color: string };
  fields: { id: string; label: string; showInTable: boolean }[];
  onMoveRecord: (recordId: string, stageId: string) => void;
}) {
  const { data } = useRecords({ stage: stage.id, pageSize: 100 });
  const records = data?.items ?? [];
  const firstField = fields.find((f) => f.showInTable);

  return (
    <div className="w-72 flex-shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-medium text-white">{stage.name}</span>
        </div>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {records.length}
        </span>
      </div>

      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="rounded-lg border border-gray-800 bg-gray-900 p-3 hover:border-gray-700"
          >
            <p className="font-medium text-white">
              {firstField ? String(record.data[firstField.id] ?? "Untitled") : "Untitled"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {new Date(record.createdAt).toLocaleDateString()}
            </p>
            {record.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {record.tags.map((tag) => (
                  <span key={tag} className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {records.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-800 py-8 text-center text-xs text-gray-600">
            No records
          </div>
        )}
      </div>
    </div>
  );
}
