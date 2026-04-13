"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function GeneralSettingsPage() {
  const { data: appData } = useAppUser();
  const qc = useQueryClient();
  const tenant = appData?.tenant;

  const [form, setForm] = useState({
    name: "",
    recordLabel: "",
    recordLabelSingular: "",
    documentLabel: "",
    pipelineEnabled: false,
    stages: [] as { id: string; name: string; color: string; order: number }[],
  });

  const [newStageName, setNewStageName] = useState("");

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name,
        recordLabel: tenant.recordLabel,
        recordLabelSingular: tenant.recordLabelSingular,
        documentLabel: tenant.documentLabel,
        pipelineEnabled: tenant.pipelineConfig?.enabled ?? false,
        stages: tenant.pipelineConfig?.stages ?? [],
      });
    }
  }, [tenant]);

  const updateTenant = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          recordLabel: form.recordLabel,
          recordLabelSingular: form.recordLabelSingular,
          documentLabel: form.documentLabel,
        }),
      });
      // Also update pipeline config via separate call
      await fetch("/api/tenants/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.pipelineEnabled,
          stages: form.stages,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-user"] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addStage = () => {
    if (!newStageName) return;
    const colors = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
    setForm({
      ...form,
      stages: [
        ...form.stages,
        {
          id: crypto.randomUUID(),
          name: newStageName,
          color: colors[form.stages.length % colors.length],
          order: form.stages.length,
        },
      ],
    });
    setNewStageName("");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white">General Settings</h1>
      <p className="mt-1 text-sm text-gray-400">Manage your workspace configuration</p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300">Company Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-300">Record Label (plural)</label>
            <input type="text" value={form.recordLabel} onChange={(e) => setForm({ ...form, recordLabel: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Record Label (singular)</label>
            <input type="text" value={form.recordLabelSingular} onChange={(e) => setForm({ ...form, recordLabelSingular: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Document Label</label>
          <input type="text" value={form.documentLabel} onChange={(e) => setForm({ ...form, documentLabel: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
        </div>

        {/* Pipeline config */}
        <div className="rounded-lg border border-gray-800 p-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.pipelineEnabled} onChange={(e) => setForm({ ...form, pipelineEnabled: e.target.checked })} className="rounded border-gray-600" />
            <span className="font-medium text-white">Enable Pipeline / Kanban Board</span>
          </label>

          {form.pipelineEnabled && (
            <div className="mt-4 space-y-2">
              {form.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-3 rounded-lg bg-gray-800 p-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="flex-1 text-sm text-white">{stage.name}</span>
                  <button
                    onClick={() => setForm({ ...form, stages: form.stages.filter((_, j) => j !== i) })}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="New stage name"
                  onKeyDown={(e) => e.key === "Enter" && addStage()}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
                <button onClick={addStage} className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-violet-400 hover:bg-gray-700">
                  Add Stage
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => updateTenant.mutate()}
          disabled={updateTenant.isPending}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Save size={16} />
          {updateTenant.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
