"use client";

import { useState, useEffect } from "react";
import { Save, Palette } from "lucide-react";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const colorPresets = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#8B5CF6"];

export default function BrandingSettingsPage() {
  const { data: appData } = useAppUser();
  const qc = useQueryClient();
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (appData?.tenant) {
      setPrimaryColor(appData.tenant.primaryColor);
      setTheme(appData.tenant.theme);
    }
  }, [appData]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryColor, theme }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-user"] });
      toast.success("Branding updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Branding</h1>
      <p className="mt-1 text-sm text-gray-400">Customize the look and feel</p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300">Primary Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => setPrimaryColor(color)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  primaryColor === color ? "scale-110 border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Theme</label>
          <div className="mt-2 flex gap-3">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-lg border px-4 py-2 text-sm capitalize ${
                  theme === t
                    ? "border-violet-500 bg-violet-600/20 text-violet-400"
                    : "border-gray-700 text-gray-400 hover:bg-gray-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 p-4">
          <p className="text-sm font-medium text-gray-300">Preview</p>
          <div className="mt-3 flex gap-3">
            <div className="rounded-lg px-4 py-2 text-sm text-white" style={{ backgroundColor: primaryColor }}>
              Primary Button
            </div>
            <div className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: primaryColor, color: primaryColor }}>
              Secondary Button
            </div>
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Save size={16} />
          {save.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
