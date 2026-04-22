"use client";

import { useState } from "react";
import { Save, Sun, Moon, Check } from "lucide-react";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useTheme } from "@/components/providers/theme-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const colorPresets = [
  { name: "Violet", color: "#7C3AED" },
  { name: "Blue", color: "#3B82F6" },
  { name: "Emerald", color: "#10B981" },
  { name: "Amber", color: "#F59E0B" },
  { name: "Rose", color: "#F43F5E" },
  { name: "Pink", color: "#EC4899" },
  { name: "Cyan", color: "#06B6D4" },
  { name: "Indigo", color: "#6366F1" },
  { name: "Orange", color: "#F97316" },
  { name: "Slate", color: "#64748B" },
];

export default function BrandingSettingsPage() {
  const { data: appData } = useAppUser();
  const qc = useQueryClient();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [customColor, setCustomColor] = useState(accentColor);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor: accentColor, theme }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-user"] });
      toast.success("Branding saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Branding</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Customize your workspace appearance</p>

      <div className="mt-8 space-y-8">
        {/* ── Theme Toggle ── */}
        <div>
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Theme</label>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>Choose between light and dark mode</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className="flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all"
              style={{
                borderColor: theme === "light" ? "var(--accent)" : "var(--border-primary)",
                backgroundColor: theme === "light" ? "var(--accent-lighter)" : "var(--bg-elevated)",
              }}
            >
              <div className="rounded-lg bg-white p-2 shadow-sm border" style={{ borderColor: "#e5e7eb" }}>
                <Sun size={20} className="text-amber-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Light</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Clean and bright</p>
              </div>
              {theme === "light" && <Check size={16} className="ml-auto" style={{ color: "var(--accent)" }} />}
            </button>

            <button
              onClick={() => setTheme("dark")}
              className="flex flex-1 items-center gap-3 rounded-xl border-2 p-4 transition-all"
              style={{
                borderColor: theme === "dark" ? "var(--accent)" : "var(--border-primary)",
                backgroundColor: theme === "dark" ? "var(--accent-lighter)" : "var(--bg-elevated)",
              }}
            >
              <div className="rounded-lg p-2 shadow-sm" style={{ backgroundColor: "#1a1b23", border: "1px solid #2a2c36" }}>
                <Moon size={20} className="text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Dark</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Easy on the eyes</p>
              </div>
              {theme === "dark" && <Check size={16} className="ml-auto" style={{ color: "var(--accent)" }} />}
            </button>
          </div>
        </div>

        {/* ── Accent Color ── */}
        <div>
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Accent Color</label>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>Used for buttons, links, and highlights throughout the app</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.color}
                onClick={() => { setAccentColor(preset.color); setCustomColor(preset.color); }}
                className="group relative flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-110"
                style={{ backgroundColor: preset.color }}
                title={preset.name}
              >
                {accentColor === preset.color && <Check size={16} className="text-white" />}
              </button>
            ))}
            <div className="relative">
              <input
                type="color"
                value={customColor}
                onChange={(e) => { setCustomColor(e.target.value); setAccentColor(e.target.value); }}
                className="h-10 w-10 cursor-pointer rounded-xl border-2 p-0.5"
                style={{ borderColor: "var(--border-primary)" }}
                title="Custom color"
              />
            </div>
          </div>
        </div>

        {/* ── Live Preview ── */}
        <div>
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Preview</label>
          <div className="mt-3 rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-primary)" }}>
            <div className="p-4" style={{ backgroundColor: "var(--bg-elevated)" }}>
              <div className="flex gap-3">
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--accent)" }}>
                  Primary Button
                </button>
                <button className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  Secondary
                </button>
                <button className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                  Ghost
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}>Badge</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--success-light)", color: "var(--success)" }}>Success</span>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--error-light)", color: "var(--error)" }}>Error</span>
              </div>
              <div className="mt-4">
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>Primary text looks like this</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Secondary text looks like this</p>
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Tertiary text looks like this</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Save size={16} />
          {save.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
