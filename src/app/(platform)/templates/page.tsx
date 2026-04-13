"use client";

import { useState } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

type Template = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  createdAt: string;
};

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", content: "" });

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setShowCreate(false);
      setForm({ name: "", description: "", content: "" });
      toast.success("Template created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-sm text-gray-400">Document templates for generating PDFs</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">New Template</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Invoice Template" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Content (HTML)</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="<h1>{{company_name}}</h1>..." className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white font-mono focus:border-violet-500 focus:outline-none" />
                <p className="mt-1 text-xs text-gray-500">Use {"{{field_name}}"} for dynamic values</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={() => create.mutate()} disabled={!form.name || !form.content || create.isPending} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                {create.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-gray-500">Loading...</div>
        ) : !templates?.length ? (
          <div className="col-span-full rounded-xl border border-dashed border-gray-700 py-12 text-center">
            <FileText size={40} className="mx-auto text-gray-700" />
            <p className="mt-3 text-gray-400">No templates yet</p>
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{t.name}</h3>
                  {t.description && <p className="mt-1 text-xs text-gray-400">{t.description}</p>}
                </div>
                <FileText size={18} className="text-gray-600" />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Created {new Date(t.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
