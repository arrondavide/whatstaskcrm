"use client";

import { useState } from "react";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

type Template = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export default function TemplatesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

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
        body: JSON.stringify({ ...form, content: "" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setShowCreate(false);
      setForm({ name: "", description: "" });
      // Navigate to the editor
      router.push(`/templates/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates</h1>
          <p className="text-sm text-gray-400">Design documents using your record fields</p>
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
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">New Template</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Template Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Employee CV, Invoice, Offer Letter" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Description (optional)</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this template for?" className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={() => create.mutate()} disabled={!form.name || create.isPending} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                {create.isPending ? "Creating..." : "Create & Design"}
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
            <p className="mt-1 text-sm text-gray-600">Create one to start designing documents</p>
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="group rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="cursor-pointer flex-1" onClick={() => router.push(`/templates/${t.id}`)}>
                  <h3 className="font-medium text-white group-hover:text-violet-400 transition-colors">{t.name}</h3>
                  {t.description && <p className="mt-1 text-xs text-gray-400">{t.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => router.push(`/templates/${t.id}`)}
                    className="rounded-md p-1.5 text-gray-600 hover:bg-gray-800 hover:text-white"
                    title="Edit template"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTemplate.mutate(t.id); }}
                    className="rounded-md p-1.5 text-gray-600 hover:bg-red-900/30 hover:text-red-400"
                    title="Delete template"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-gray-600">
                Created {new Date(t.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
