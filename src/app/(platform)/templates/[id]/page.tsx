"use client";

import { use, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Plus, Trash2, Type, Image, Minus, Columns, List,
  ChevronUp, ChevronDown, FileText, Upload, GripVertical, AlignLeft,
  AlignCenter, AlignRight, Bold, Eye,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFields, type FieldItem } from "@/hooks/queries/use-fields";
import { useRecords } from "@/hooks/queries/use-records";
import toast from "react-hot-toast";
import type { TemplateBlock, TemplateStyles } from "@/db/schema";

const BLOCK_TYPES = [
  { type: "header", label: "Header", icon: Type, desc: "Company logo + title" },
  { type: "text", label: "Text", icon: Type, desc: "Static text with styling" },
  { type: "field", label: "Field Value", icon: FileText, desc: "Dynamic value from record" },
  { type: "image", label: "Static Image", icon: Image, desc: "Logo, signature, watermark" },
  { type: "dynamic_image", label: "Record Image", icon: Image, desc: "Photo from record field" },
  { type: "table", label: "Field Table", icon: List, desc: "Key-value table of fields" },
  { type: "divider", label: "Divider", icon: Minus, desc: "Horizontal line" },
  { type: "spacer", label: "Spacer", icon: GripVertical, desc: "Vertical spacing" },
] as const;

function newBlock(type: string): TemplateBlock {
  const id = crypto.randomUUID();
  const base = { id, type: type as TemplateBlock["type"], style: {} };
  switch (type) {
    case "header": return { ...base, content: "Company Name", style: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 8 } };
    case "text": return { ...base, content: "Type your text here...", style: { fontSize: 12, marginBottom: 4 } };
    case "field": return { ...base, fieldId: "", style: { fontSize: 12, marginBottom: 4 } };
    case "image": return { ...base, src: "", style: { width: "150", height: 80, marginBottom: 8 } };
    case "dynamic_image": return { ...base, fieldId: "", style: { width: "120", height: 120, borderRadius: 8, marginBottom: 8 } };
    case "table": return { ...base, content: "", style: { fontSize: 11, marginBottom: 8 } };
    case "divider": return { ...base, style: { marginTop: 8, marginBottom: 8 } };
    case "spacer": return { ...base, style: { height: 20 } };
    default: return { ...base, content: "" };
  }
}

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { data: fields } = useFields();
  const { data: recordsData } = useRecords({ pageSize: 5 });
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [previewRecordIdx, setPreviewRecordIdx] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBlockIdRef = useRef<string | null>(null);

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", id],
    queryFn: async () => {
      const res = await fetch(`/api/templates/${id}`);
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
      return d.data as { id: string; name: string; description: string | null; blocks: TemplateBlock[]; styles: TemplateStyles };
    },
  });

  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [styles, setStyles] = useState<TemplateStyles>({ pageSize: "A4", orientation: "portrait", marginTop: 40, marginBottom: 40, marginLeft: 40, marginRight: 40, fontFamily: "Helvetica" });
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Sync from server on first load
  if (template && !loaded) {
    setBlocks(template.blocks ?? []);
    setStyles(template.styles ?? styles);
    setName(template.name);
    setLoaded(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, blocks, styles }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["template", id] }); toast.success("Template saved"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const addBlock = (type: string) => {
    setBlocks([...blocks, newBlock(type)]);
  };

  const updateBlock = (blockId: string, updates: Partial<TemplateBlock>) => {
    setBlocks(blocks.map((b) => b.id === blockId ? { ...b, ...updates } : b));
  };

  const updateBlockStyle = (blockId: string, styleUpdates: Partial<NonNullable<TemplateBlock["style"]>>) => {
    setBlocks(blocks.map((b) => b.id === blockId ? { ...b, style: { ...b.style, ...styleUpdates } } : b));
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
    if (selectedBlock === blockId) setSelectedBlock(null);
  };

  const moveBlock = (index: number, dir: "up" | "down") => {
    const newIdx = dir === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const arr = [...blocks];
    [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
    setBlocks(arr);
  };

  const handleImageUpload = async (file: File, blockId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const d = await res.json();
      if (d.success) {
        updateBlock(blockId, { src: d.data.url });
        toast.success("Image uploaded");
      } else {
        toast.error(d.error?.message ?? "Upload failed");
      }
    } catch { toast.error("Upload failed"); }
  };

  const previewRecord = recordsData?.items?.[previewRecordIdx];
  const recordData = (previewRecord?.data ?? {}) as Record<string, unknown>;
  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  const getFieldLabel = (fieldId: string) => fields?.find((f) => f.id === fieldId)?.label ?? fieldId;
  const getFieldValue = (fieldId: string) => {
    const val = recordData[fieldId];
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/templates")} className="rounded-md p-1.5 text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-lg font-bold text-white focus:outline-none border-b border-transparent focus:border-violet-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${showPreview ? "border-violet-500 text-violet-400" : "border-gray-700 text-gray-400 hover:text-white"}`}
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Save size={14} />
            {save.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Block Types + Fields ── */}
        <div className="w-56 flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Add Block</p>
          <div className="space-y-1">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <bt.icon size={14} />
                <div>
                  <p className="font-medium">{bt.label}</p>
                  <p className="text-[10px] text-gray-600">{bt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Your Fields</p>
          <div className="space-y-0.5">
            {(fields ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  const b = newBlock("field");
                  b.fieldId = f.id;
                  b.content = f.label;
                  setBlocks([...blocks, b]);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <FileText size={12} />
                {f.label}
                <span className="ml-auto text-[9px] text-gray-600">{f.type}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Page Setup</p>
          <div className="space-y-2">
            <select value={styles.pageSize} onChange={(e) => setStyles({ ...styles, pageSize: e.target.value as TemplateStyles["pageSize"] })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white">
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
            <select value={styles.orientation} onChange={(e) => setStyles({ ...styles, orientation: e.target.value as TemplateStyles["orientation"] })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>

        {/* ── Center: Block Canvas ── */}
        <div className="flex-1 overflow-y-auto bg-gray-950 p-6">
          <div
            className="mx-auto bg-white shadow-xl"
            style={{
              width: styles.orientation === "landscape" ? 842 : 595,
              minHeight: styles.orientation === "landscape" ? 595 : 842,
              padding: `${styles.marginTop ?? 40}px ${styles.marginRight ?? 40}px ${styles.marginBottom ?? 40}px ${styles.marginLeft ?? 40}px`,
              transform: "scale(0.75)",
              transformOrigin: "top center",
            }}
            id="template-preview"
          >
            {blocks.length === 0 && (
              <div className="flex h-64 items-center justify-center text-gray-400">
                <p className="text-sm">Click blocks on the left to start designing</p>
              </div>
            )}

            {blocks.map((block, idx) => {
              const isSelected = selectedBlock === block.id;
              const s = block.style ?? {};

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlock(block.id)}
                  className={`group relative cursor-pointer ${isSelected ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-white" : "hover:ring-1 hover:ring-gray-300"}`}
                  style={{ marginTop: s.marginTop, marginBottom: s.marginBottom }}
                >
                  {/* Block controls */}
                  <div className="absolute -left-8 top-0 hidden flex-col gap-0.5 group-hover:flex">
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, "up"); }} className="rounded bg-gray-200 p-0.5 hover:bg-gray-300"><ChevronUp size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, "down"); }} className="rounded bg-gray-200 p-0.5 hover:bg-gray-300"><ChevronDown size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="rounded bg-red-100 p-0.5 text-red-500 hover:bg-red-200"><Trash2 size={12} /></button>
                  </div>

                  {/* Render block */}
                  {block.type === "header" && (
                    <div style={{ fontSize: s.fontSize ?? 24, fontWeight: s.fontWeight ?? "bold", textAlign: (s.textAlign as "left" | "center" | "right") ?? "center", color: s.color ?? "#000", backgroundColor: s.backgroundColor, padding: s.padding }}>
                      {showPreview ? (block.content ?? "Header") : (
                        <input type="text" value={block.content ?? ""} onChange={(e) => updateBlock(block.id, { content: e.target.value })} className="w-full bg-transparent text-center focus:outline-none" style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit", textAlign: "inherit" }} onClick={(e) => e.stopPropagation()} />
                      )}
                    </div>
                  )}

                  {block.type === "text" && (
                    <div style={{ fontSize: s.fontSize ?? 12, fontWeight: s.fontWeight, color: s.color ?? "#333", textAlign: (s.textAlign as "left" | "center" | "right") ?? "left", padding: s.padding }}>
                      {showPreview ? (block.content ?? "") : (
                        <textarea value={block.content ?? ""} onChange={(e) => updateBlock(block.id, { content: e.target.value })} className="w-full resize-none bg-transparent focus:outline-none" style={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }} rows={2} onClick={(e) => e.stopPropagation()} />
                      )}
                    </div>
                  )}

                  {block.type === "field" && (
                    <div style={{ fontSize: s.fontSize ?? 12, color: s.color ?? "#333", padding: s.padding }}>
                      {showPreview ? (
                        <span>{block.fieldId ? getFieldValue(block.fieldId) : "Select a field →"}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                            {block.fieldId ? getFieldLabel(block.fieldId) : "No field"}
                          </span>
                          <select
                            value={block.fieldId ?? ""}
                            onChange={(e) => updateBlock(block.id, { fieldId: e.target.value })}
                            className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Pick field...</option>
                            {(fields ?? []).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === "image" && (
                    <div style={{ textAlign: (s.textAlign as "left" | "center" | "right") ?? "left" }}>
                      {block.src ? (
                        <img src={block.src} alt="" style={{ width: Number(s.width) || 150, height: s.height || "auto", borderRadius: s.borderRadius, objectFit: "contain" }} />
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); uploadBlockIdRef.current = block.id; fileInputRef.current?.click(); }}
                          className="flex items-center gap-2 rounded border-2 border-dashed border-gray-300 px-4 py-3 text-xs text-gray-400 hover:border-violet-400"
                        >
                          <Upload size={14} />
                          Upload Image
                        </button>
                      )}
                    </div>
                  )}

                  {block.type === "dynamic_image" && (
                    <div style={{ textAlign: (s.textAlign as "left" | "center" | "right") ?? "left" }}>
                      {showPreview && block.fieldId ? (
                        (() => {
                          const val = recordData[block.fieldId];
                          const files = Array.isArray(val) ? val : [];
                          const firstFile = files[0];
                          return firstFile?.url ? (
                            <img src={firstFile.url} alt="" style={{ width: Number(s.width) || 120, height: s.height || 120, borderRadius: s.borderRadius, objectFit: "cover" }} />
                          ) : <div className="inline-block rounded bg-gray-200 p-4 text-xs text-gray-400">No image</div>;
                        })()
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-600">
                          <Image size={14} />
                          {block.fieldId ? `Image: ${getFieldLabel(block.fieldId)}` : "Select image field →"}
                          <select value={block.fieldId ?? ""} onChange={(e) => updateBlock(block.id, { fieldId: e.target.value })} className="ml-1 rounded border bg-white px-1 py-0.5 text-[10px]" onClick={(e) => e.stopPropagation()}>
                            <option value="">Pick field...</option>
                            {(fields ?? []).filter((f) => f.type === "file").map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {block.type === "table" && (
                    <table style={{ width: "100%", fontSize: s.fontSize ?? 11, borderCollapse: "collapse" }}>
                      <tbody>
                        {(fields ?? []).filter((f) => f.showInTable).map((f) => (
                          <tr key={f.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: "4px 8px", fontWeight: "600", color: "#555", width: "30%" }}>{f.label}</td>
                            <td style={{ padding: "4px 8px", color: "#333" }}>
                              {showPreview ? getFieldValue(f.id) : `{{${f.label}}}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {block.type === "divider" && (
                    <hr style={{ border: "none", borderTop: `1px solid ${s.color ?? "#ddd"}` }} />
                  )}

                  {block.type === "spacer" && (
                    <div style={{ height: s.height ?? 20 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Properties Panel ── */}
        <div className="w-56 flex-shrink-0 overflow-y-auto border-l border-gray-800 bg-gray-900 p-3">
          {selectedBlockData ? (
            <>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Block Properties</p>
              <div className="space-y-3">
                {/* Font size */}
                {["header", "text", "field", "table"].includes(selectedBlockData.type) && (
                  <div>
                    <label className="text-[10px] text-gray-500">Font Size</label>
                    <input type="number" value={selectedBlockData.style?.fontSize ?? 12} onChange={(e) => updateBlockStyle(selectedBlockData.id, { fontSize: Number(e.target.value) })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                  </div>
                )}

                {/* Bold */}
                {["header", "text", "field"].includes(selectedBlockData.type) && (
                  <div>
                    <label className="text-[10px] text-gray-500">Style</label>
                    <div className="mt-1 flex gap-1">
                      <button onClick={() => updateBlockStyle(selectedBlockData.id, { fontWeight: selectedBlockData.style?.fontWeight === "bold" ? "normal" : "bold" })} className={`rounded-md p-1.5 ${selectedBlockData.style?.fontWeight === "bold" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                        <Bold size={12} />
                      </button>
                      <button onClick={() => updateBlockStyle(selectedBlockData.id, { textAlign: "left" })} className={`rounded-md p-1.5 ${selectedBlockData.style?.textAlign === "left" || !selectedBlockData.style?.textAlign ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                        <AlignLeft size={12} />
                      </button>
                      <button onClick={() => updateBlockStyle(selectedBlockData.id, { textAlign: "center" })} className={`rounded-md p-1.5 ${selectedBlockData.style?.textAlign === "center" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                        <AlignCenter size={12} />
                      </button>
                      <button onClick={() => updateBlockStyle(selectedBlockData.id, { textAlign: "right" })} className={`rounded-md p-1.5 ${selectedBlockData.style?.textAlign === "right" ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                        <AlignRight size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Color */}
                <div>
                  <label className="text-[10px] text-gray-500">Color</label>
                  <input type="color" value={selectedBlockData.style?.color ?? "#000000"} onChange={(e) => updateBlockStyle(selectedBlockData.id, { color: e.target.value })} className="mt-1 h-7 w-full rounded cursor-pointer" />
                </div>

                {/* Background */}
                {["header", "text"].includes(selectedBlockData.type) && (
                  <div>
                    <label className="text-[10px] text-gray-500">Background</label>
                    <input type="color" value={selectedBlockData.style?.backgroundColor ?? "#ffffff"} onChange={(e) => updateBlockStyle(selectedBlockData.id, { backgroundColor: e.target.value })} className="mt-1 h-7 w-full rounded cursor-pointer" />
                  </div>
                )}

                {/* Spacing */}
                <div>
                  <label className="text-[10px] text-gray-500">Top Margin</label>
                  <input type="number" value={selectedBlockData.style?.marginTop ?? 0} onChange={(e) => updateBlockStyle(selectedBlockData.id, { marginTop: Number(e.target.value) })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Bottom Margin</label>
                  <input type="number" value={selectedBlockData.style?.marginBottom ?? 0} onChange={(e) => updateBlockStyle(selectedBlockData.id, { marginBottom: Number(e.target.value) })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                </div>

                {/* Image dimensions */}
                {["image", "dynamic_image"].includes(selectedBlockData.type) && (
                  <>
                    <div>
                      <label className="text-[10px] text-gray-500">Width (px)</label>
                      <input type="number" value={Number(selectedBlockData.style?.width) || 150} onChange={(e) => updateBlockStyle(selectedBlockData.id, { width: e.target.value })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Height (px)</label>
                      <input type="number" value={selectedBlockData.style?.height ?? 80} onChange={(e) => updateBlockStyle(selectedBlockData.id, { height: Number(e.target.value) })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                    </div>
                    {selectedBlockData.type === "image" && selectedBlockData.src && (
                      <button
                        onClick={() => { uploadBlockIdRef.current = selectedBlockData.id; fileInputRef.current?.click(); }}
                        className="w-full rounded-md border border-gray-700 px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        Replace Image
                      </button>
                    )}
                  </>
                )}

                {/* Spacer height */}
                {selectedBlockData.type === "spacer" && (
                  <div>
                    <label className="text-[10px] text-gray-500">Height (px)</label>
                    <input type="number" value={selectedBlockData.style?.height ?? 20} onChange={(e) => updateBlockStyle(selectedBlockData.id, { height: Number(e.target.value) })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                  </div>
                )}

                {/* Padding */}
                <div>
                  <label className="text-[10px] text-gray-500">Padding</label>
                  <input type="number" value={selectedBlockData.style?.padding ?? 0} onChange={(e) => updateBlockStyle(selectedBlockData.id, { padding: Number(e.target.value) })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs text-gray-600">Click a block to edit its properties</p>
            </div>
          )}

          {/* Preview record selector */}
          {showPreview && recordsData?.items && recordsData.items.length > 0 && (
            <div className="mt-6 border-t border-gray-800 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Preview Record</p>
              <select
                value={previewRecordIdx}
                onChange={(e) => setPreviewRecordIdx(Number(e.target.value))}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white"
              >
                {recordsData.items.map((r, i) => {
                  const firstField = fields?.find((f) => f.showInTable);
                  const label = firstField ? String((r.data as Record<string, unknown>)[firstField.id] ?? `Record ${i + 1}`) : `Record ${i + 1}`;
                  return <option key={r.id} value={i}>{label}</option>;
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadBlockIdRef.current) {
            handleImageUpload(file, uploadBlockIdRef.current);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
