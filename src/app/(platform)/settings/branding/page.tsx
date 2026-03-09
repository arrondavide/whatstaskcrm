"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTenantStore } from "@/stores/tenant-store";
import toast from "react-hot-toast";

const presetColors = [
  "#7C3AED", // Purple
  "#2563EB", // Blue
  "#059669", // Green
  "#DC2626", // Red
  "#EA580C", // Orange
  "#D97706", // Amber
  "#DB2777", // Pink
  "#0891B2", // Cyan
];

export default function BrandingSettingsPage() {
  const { tenant } = useTenantStore();
  const [primaryColor, setPrimaryColor] = useState(
    tenant?.branding.primary_color || "#7C3AED"
  );
  const [logoUrl, setLogoUrl] = useState(tenant?.branding.logo_url || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      // TODO: Update branding in Firestore
      toast.success("Branding updated");
    } catch {
      toast.error("Failed to update branding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="Branding" description="Customize your workspace appearance">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-lg border border-border text-2xl font-bold"
                style={{ backgroundColor: primaryColor, color: "#fff" }}
              >
                {tenant?.branding.name?.[0] || "C"}
              </div>
              <div className="space-y-2 flex-1">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">
                  Upload your logo to a hosting service and paste the URL here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Color</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setPrimaryColor(color)}
                  className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                    primaryColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Label>Custom color</Label>
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#7C3AED"
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={loading}>
            Save Changes
          </Button>
        </div>
      </div>
    </Shell>
  );
}
