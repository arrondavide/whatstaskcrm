"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, MessageSquare, Link2, History, AlertTriangle, X, Send, FileDown } from "lucide-react";
import { useRecord, useUpdateRecord, useDeleteRecord } from "@/hooks/queries/use-records";
import { useFields } from "@/hooks/queries/use-fields";
import { useAppUser } from "@/hooks/queries/use-auth";
import { FieldInput, FieldValueDisplay } from "@/components/records/field-input";
import { validateRecordData } from "@/lib/validate-record";
import { evaluateFormula } from "@/lib/formula";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: record, isLoading } = useRecord(id);
  const { data: fields } = useFields();
  const { data: appData } = useAppUser();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"comments" | "links" | "history">("comments");
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Templates for document generation
  const { data: templatesList } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      const d = await res.json();
      return d.data ?? [];
    },
  });
  const qc = useQueryClient();

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!record) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Record not found</div>;
  }

  const isEditing = editData !== null;

  const getFirstFieldValue = () => {
    const firstField = fields?.find((f) => f.showInTable);
    if (!firstField) return "document";
    return String((record.data as Record<string, unknown>)[firstField.id] ?? "document");
  };

  const handleSave = () => {
    if (!editData) return;
    const errors = validateRecordData(editData, fields ?? []);
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {};
      errors.forEach((e) => { errorMap[e.fieldId] = e.message; });
      setFormErrors(errorMap);
      toast.error(errors[0].message);
      return;
    }
    setFormErrors({});
    updateRecord.mutate({ id, data: editData }, {
      onSuccess: () => { setEditData(null); setFormErrors({}); },
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    deleteRecord.mutate(id, {
      onSuccess: () => router.push("/records"),
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/records")}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">
            {appData?.tenant?.recordLabelSingular ?? "Record"} Details
          </h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setEditData(null)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateRecord.isPending}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                <Save size={16} />
                {updateRecord.isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowGenerate(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                <FileDown size={16} />
                Generate PDF
              </button>
              <button
                onClick={() => setEditData({ ...(record.data as Record<string, unknown>) })}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {(fields ?? []).map((field) => (
            <div key={field.id} className={field.type === "textarea" || field.type === "file" ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-medium text-gray-400">
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              {isEditing ? (
                <>
                  <FieldInput
                    field={field}
                    value={editData[field.id]}
                    onChange={(val) => {
                      setEditData({ ...editData!, [field.id]: val });
                      if (formErrors[field.id]) {
                        const next = { ...formErrors };
                        delete next[field.id];
                        setFormErrors(next);
                      }
                    }}
                  />
                  {formErrors[field.id] && (
                    <p className="mt-1 text-xs text-red-400">{formErrors[field.id]}</p>
                  )}
                </>
              ) : (
                <div className="mt-1 text-sm text-white">
                  {field.type === "formula" ? (
                    <span className="text-violet-300">
                      {String(evaluateFormula(
                        (field.config as { formula?: string })?.formula ?? "",
                        record.data as Record<string, unknown>
                      ) ?? "—")}
                    </span>
                  ) : (
                    <FieldValueDisplay field={field} value={(record.data as Record<string, unknown>)[field.id]} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-gray-800 pt-4">
          <div className="grid gap-4 text-xs text-gray-500 sm:grid-cols-3">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date(record.createdAt).toLocaleString()}
            </div>
            {record.updatedAt && (
              <div>
                <span className="font-medium">Updated:</span>{" "}
                {new Date(record.updatedAt).toLocaleString()}
              </div>
            )}
            <div>
              <span className="font-medium">Version:</span> {record.version}
            </div>
          </div>
          {record.tags.length > 0 && (
            <div className="mt-3 flex gap-2">
              {record.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Generate Document Modal ── */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">Generate Document</h2>
            <p className="mt-1 text-sm text-gray-400">Select a template to generate a PDF for this record</p>
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {(!templatesList || templatesList.length === 0) ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  No templates yet. Go to Templates to create one.
                </p>
              ) : (
                templatesList.map((t: { id: string; name: string; description: string | null }) => (
                  <button
                    key={t.id}
                    onClick={async () => {
                      setGenerating(true);
                      try {
                        // Fetch template with blocks
                        const res = await fetch(`/api/templates/${t.id}`);
                        const d = await res.json();
                        if (!d.success) throw new Error("Failed to load template");
                        const tmpl = d.data;

                        // Build HTML from blocks + record data
                        const html = buildDocumentHTML(tmpl.blocks ?? [], tmpl.styles ?? {}, record.data as Record<string, unknown>, fields ?? []);

                        // Generate PDF using jspdf + html
                        const { default: jsPDF } = await import("jspdf");
                        const doc = new jsPDF({
                          orientation: tmpl.styles?.orientation === "landscape" ? "landscape" : "portrait",
                          unit: "pt",
                          format: tmpl.styles?.pageSize?.toLowerCase() ?? "a4",
                        });

                        // Use html method
                        const container = globalThis.document.createElement("div");
                        container.innerHTML = html;
                        container.style.width = tmpl.styles?.orientation === "landscape" ? "842px" : "595px";
                        container.style.position = "absolute";
                        container.style.left = "-9999px";
                        globalThis.document.body.appendChild(container);

                        await doc.html(container, {
                          callback: (doc) => {
                            doc.save(`${tmpl.name} - ${getFirstFieldValue()}.pdf`);
                            globalThis.document.body.removeChild(container);
                          },
                          x: tmpl.styles?.marginLeft ?? 40,
                          y: tmpl.styles?.marginTop ?? 40,
                          width: (tmpl.styles?.orientation === "landscape" ? 842 : 595) - ((tmpl.styles?.marginLeft ?? 40) + (tmpl.styles?.marginRight ?? 40)),
                          windowWidth: tmpl.styles?.orientation === "landscape" ? 842 : 595,
                        });

                        setShowGenerate(false);
                        toast.success("PDF generated!");
                      } catch (err) {
                        toast.error("Failed to generate PDF");
                        console.error(err);
                      } finally {
                        setGenerating(false);
                      }
                    }}
                    disabled={generating}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-800 p-3 text-left hover:border-violet-500 hover:bg-gray-800/50 disabled:opacity-50"
                  >
                    <FileDown size={18} className="text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowGenerate(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs: Comments | Linked Records | History ── */}
      <div className="mt-6">
        <div className="flex gap-1 border-b border-gray-800">
          {([
            { key: "comments" as const, label: "Comments", icon: MessageSquare },
            { key: "links" as const, label: "Linked Records", icon: Link2 },
            { key: "history" as const, label: "History", icon: History },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === "comments" && <CommentsSection recordId={id} tenantId={appData?.user?.tenantId ?? ""} qc={qc} />}
          {activeTab === "links" && <LinkedRecordsSection recordId={id} fields={fields ?? []} qc={qc} />}
          {activeTab === "history" && <RevisionHistorySection recordId={id} fields={fields ?? []} qc={qc} />}
        </div>
      </div>
    </div>
  );
}

// ── Build Document HTML from Template Blocks ──────

function buildDocumentHTML(
  blocks: { id: string; type: string; content?: string; fieldId?: string; src?: string; style?: Record<string, unknown> }[],
  styles: Record<string, unknown>,
  recordData: Record<string, unknown>,
  fields: { id: string; label: string; showInTable: boolean }[]
): string {
  const getVal = (fieldId: string) => {
    const val = recordData[fieldId];
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.map((v) => typeof v === "object" && v !== null && "name" in v ? (v as { name: string }).name : String(v)).join(", ");
    return String(val);
  };

  const getLabel = (fieldId: string) => fields.find((f) => f.id === fieldId)?.label ?? fieldId;

  const css = (s: Record<string, unknown> | undefined) => {
    if (!s) return "";
    const map: Record<string, string> = {};
    if (s.fontSize) map["font-size"] = `${s.fontSize}px`;
    if (s.fontWeight) map["font-weight"] = String(s.fontWeight);
    if (s.color) map["color"] = String(s.color);
    if (s.textAlign) map["text-align"] = String(s.textAlign);
    if (s.backgroundColor) map["background-color"] = String(s.backgroundColor);
    if (s.padding) map["padding"] = `${s.padding}px`;
    if (s.marginTop) map["margin-top"] = `${s.marginTop}px`;
    if (s.marginBottom) map["margin-bottom"] = `${s.marginBottom}px`;
    return Object.entries(map).map(([k, v]) => `${k}:${v}`).join(";");
  };

  const html = blocks.map((block) => {
    const s = block.style ?? {};
    switch (block.type) {
      case "header":
        return `<div style="${css(s)}">${block.content ?? ""}</div>`;
      case "text":
        return `<div style="${css(s)}">${block.content ?? ""}</div>`;
      case "field":
        return `<div style="${css(s)}">${block.fieldId ? getVal(block.fieldId) : ""}</div>`;
      case "image":
        return block.src ? `<div style="text-align:${s.textAlign ?? "left"}"><img src="${block.src}" style="width:${s.width ?? 150}px;height:${s.height ?? "auto"}px;object-fit:contain;" /></div>` : "";
      case "dynamic_image": {
        if (!block.fieldId) return "";
        const val = recordData[block.fieldId];
        const files = Array.isArray(val) ? val : [];
        const first = files[0] as { url?: string } | undefined;
        return first?.url ? `<div style="text-align:${s.textAlign ?? "left"}"><img src="${first.url}" style="width:${s.width ?? 120}px;height:${s.height ?? 120}px;object-fit:cover;border-radius:${s.borderRadius ?? 0}px;" /></div>` : "";
      }
      case "table":
        return `<table style="width:100%;font-size:${s.fontSize ?? 11}px;border-collapse:collapse;${css(s)}">
          ${fields.filter((f) => f.showInTable).map((f) => `<tr style="border-bottom:1px solid #eee"><td style="padding:4px 8px;font-weight:600;color:#555;width:30%">${f.label}</td><td style="padding:4px 8px;color:#333">${getVal(f.id)}</td></tr>`).join("")}
        </table>`;
      case "divider":
        return `<hr style="border:none;border-top:1px solid ${s.color ?? "#ddd"};margin:${s.marginTop ?? 8}px 0 ${s.marginBottom ?? 8}px 0;" />`;
      case "spacer":
        return `<div style="height:${s.height ?? 20}px"></div>`;
      default:
        return "";
    }
  }).join("\n");

  return `<div style="font-family:${styles.fontFamily ?? "Helvetica"},Arial,sans-serif;color:#333;line-height:1.5">${html}</div>`;
}

// ── Comments Section ──────────────────────────────

function CommentsSection({ recordId, tenantId, qc }: { recordId: string; tenantId: string; qc: ReturnType<typeof useQueryClient> }) {
  const { data: appData } = useAppUser();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["comments", recordId],
    queryFn: async () => {
      const res = await fetch(`/api/records/comments?recordId=${recordId}`);
      const d = await res.json();
      return d.data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async (body: { content: string; parentId?: string }) => {
      const res = await fetch("/api/records/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, ...body }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", recordId] });
      setNewComment("");
      setReplyTo(null);
      setReplyContent("");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await fetch("/api/records/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, deleted: true }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", recordId] }),
  });

  const getAvatarColor = (name: string) => {
    const colors = ["bg-violet-600", "bg-blue-600", "bg-green-600", "bg-amber-600", "bg-pink-600"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div>
      {/* Add comment */}
      <div className="flex gap-3">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(appData?.user?.name ?? "U")}`}>
          {appData?.user?.name?.charAt(0).toUpperCase() ?? "U"}
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => addComment.mutate({ content: newComment })}
              disabled={!newComment.trim() || addComment.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Send size={12} />
              Comment
            </button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="mt-6 space-y-4">
        {(comments ?? []).map((c: { id: string; content: string; authorName: string; authorId: string; createdAt: string; edited: boolean; replies?: { id: string; content: string; authorName: string; authorId: string; createdAt: string; edited: boolean }[] }) => (
          <div key={c.id}>
            <div className="flex gap-3 group">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(c.authorName)}`}>
                {c.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{c.authorName}</span>
                  <span className="text-[10px] text-gray-600">{new Date(c.createdAt).toLocaleString()}</span>
                  {c.edited && <span className="text-[10px] text-gray-600">(edited)</span>}
                </div>
                <p className="mt-0.5 text-sm text-gray-300">{c.content}</p>
                <div className="mt-1 flex gap-3">
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-[11px] text-gray-500 hover:text-violet-400">Reply</button>
                  {(c.authorId === appData?.user?.id || appData?.user?.role === "admin") && (
                    <button onClick={() => deleteComment.mutate(c.id)} className="text-[11px] text-gray-500 hover:text-red-400">Delete</button>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {c.replies?.map((r) => (
              <div key={r.id} className="ml-11 mt-2 flex gap-3 group">
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white ${getAvatarColor(r.authorName)}`}>
                  {r.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{r.authorName}</span>
                    <span className="text-[10px] text-gray-600">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-300">{r.content}</p>
                </div>
              </div>
            ))}

            {/* Reply input */}
            {replyTo === c.id && (
              <div className="ml-11 mt-2 flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && replyContent.trim()) {
                      addComment.mutate({ content: replyContent, parentId: c.id });
                    }
                  }}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => { if (replyContent.trim()) addComment.mutate({ content: replyContent, parentId: c.id }); }}
                  disabled={!replyContent.trim()}
                  className="rounded-md bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}
        {(!comments || comments.length === 0) && (
          <p className="py-4 text-center text-sm text-gray-600">No comments yet</p>
        )}
      </div>
    </div>
  );
}

// ── Linked Records Section ────────────────────────

function LinkedRecordsSection({ recordId, fields, qc }: { recordId: string; fields: { id: string; label: string; showInTable: boolean }[]; qc: ReturnType<typeof useQueryClient> }) {
  const { data: appData } = useAppUser();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: links } = useQuery({
    queryKey: ["record-links", recordId],
    queryFn: async () => {
      const res = await fetch(`/api/records/links?recordId=${recordId}`);
      const d = await res.json();
      return d.data ?? [];
    },
  });

  // Search records to link
  const { data: searchResults } = useQuery({
    queryKey: ["link-search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/records?search=${searchQuery}&pageSize=5`);
      const d = await res.json();
      return (d.data?.items ?? []).filter((r: { id: string }) => r.id !== recordId);
    },
    enabled: searchQuery.length > 1,
  });

  const addLink = useMutation({
    mutationFn: async (targetId: string) => {
      const res = await fetch("/api/records/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceRecordId: recordId, targetRecordId: targetId }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["record-links", recordId] });
      setShowSearch(false);
      setSearchQuery("");
      toast.success("Record linked");
    },
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      await fetch("/api/records/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["record-links", recordId] }),
  });

  const firstField = fields.find((f) => f.showInTable);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{(links ?? []).length} linked records</p>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <Link2 size={12} />
          Link Record
        </button>
      </div>

      {showSearch && (
        <div className="mt-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records to link..."
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
            autoFocus
          />
          {searchResults && searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((r: { id: string; data: Record<string, unknown>; createdAt: string }) => (
                <button
                  key={r.id}
                  onClick={() => addLink.mutate(r.id)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                >
                  <span>{firstField ? String(r.data[firstField.id] ?? "Untitled") : r.id.slice(0, 8)}</span>
                  <span className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {(links ?? []).map((link: { linkId: string; linkType: string; record: { id: string; data: Record<string, unknown>; createdAt: string } }) => (
          <div key={link.linkId} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-3">
            <a href={`/records/${link.record.id}`} className="text-sm font-medium text-violet-400 hover:text-violet-300">
              {firstField ? String(link.record.data[firstField.id] ?? "Untitled") : link.record.id.slice(0, 8)}
            </a>
            <div className="flex items-center gap-2">
              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">{link.linkType}</span>
              <button onClick={() => removeLink.mutate(link.linkId)} className="text-gray-600 hover:text-red-400">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
        {(!links || links.length === 0) && (
          <p className="py-4 text-center text-sm text-gray-600">No linked records</p>
        )}
      </div>
    </div>
  );
}

// ── Revision History Section ──────────────────────

function RevisionHistorySection({ recordId, fields, qc }: { recordId: string; fields: { id: string; label: string }[]; qc: ReturnType<typeof useQueryClient> }) {
  const { data: revisions } = useQuery({
    queryKey: ["revisions", recordId],
    queryFn: async () => {
      const res = await fetch(`/api/records/revisions?recordId=${recordId}`);
      const d = await res.json();
      return d.data ?? [];
    },
  });

  const restore = useMutation({
    mutationFn: async (version: number) => {
      const res = await fetch("/api/records/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, version }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["record", recordId] });
      qc.invalidateQueries({ queryKey: ["revisions", recordId] });
      toast.success("Record restored to this version");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getFieldLabel = (fieldId: string) => fields.find((f) => f.id === fieldId)?.label ?? fieldId;

  return (
    <div>
      {(!revisions || revisions.length === 0) ? (
        <p className="py-4 text-center text-sm text-gray-600">No edit history yet</p>
      ) : (
        <div className="space-y-3">
          {revisions.map((rev: { id: string; version: number; changedByName: string; createdAt: string; changes: Record<string, { old: unknown; new: unknown }> | null }) => (
            <div key={rev.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs font-mono text-gray-400">v{rev.version}</span>
                  <span className="text-sm font-medium text-white">{rev.changedByName}</span>
                  <span className="text-xs text-gray-500">{new Date(rev.createdAt).toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Restore to version ${rev.version}?`)) restore.mutate(rev.version);
                  }}
                  className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Restore
                </button>
              </div>

              {/* Changes diff */}
              {rev.changes && Object.keys(rev.changes).length > 0 && (
                <div className="mt-3 space-y-1">
                  {Object.entries(rev.changes).map(([fieldId, change]) => (
                    <div key={fieldId} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-400">{getFieldLabel(fieldId)}:</span>
                      <span className="rounded bg-red-900/20 px-1.5 py-0.5 text-red-400 line-through">
                        {String(change.old ?? "empty")}
                      </span>
                      <span className="text-gray-600">→</span>
                      <span className="rounded bg-green-900/20 px-1.5 py-0.5 text-green-400">
                        {String(change.new ?? "empty")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
