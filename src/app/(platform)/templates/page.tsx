"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useTenantStore } from "@/stores/tenant-store";
import { Plus, FileText, Edit, Eye } from "lucide-react";
import toast from "react-hot-toast";

interface DocumentTemplate {
  id: string;
  name: string;
  included_fields: string[];
  exclude_sensitive: boolean;
  show_logo: boolean;
  show_date: boolean;
  show_signature: boolean;
}

export default function TemplatesPage() {
  const { tenant, fields } = useTenantStore();
  const [showModal, setShowModal] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [excludeSensitive, setExcludeSensitive] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  function toggleField(fieldId: string) {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const template: DocumentTemplate = {
      id: `tmpl_${Date.now()}`,
      name: name.trim(),
      included_fields: selectedFields,
      exclude_sensitive: excludeSensitive,
      show_logo: showLogo,
      show_date: showDate,
      show_signature: showSignature,
    };

    setTemplates([...templates, template]);
    setShowModal(false);
    setName("");
    setSelectedFields([]);
    toast.success("Template created");
  }

  const docLabel = tenant?.document_label || "Documents";

  return (
    <Shell
      title={docLabel}
      description="Manage your export templates"
      actions={
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      }
    >
      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No templates yet"
          description="Create your first export template to generate documents"
          action={{ label: "Create Template", onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <Card key={tmpl.id}>
              <CardHeader>
                <CardTitle className="text-base">{tmpl.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {tmpl.included_fields.length} fields included
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create template modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Template"
        description="Choose which fields to include in exported documents"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label required>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Employment Certificate"
            />
          </div>

          {/* Field selection */}
          <div className="space-y-2">
            <Label>Fields to include</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => toggleField(field.id)}
                      className="h-4 w-4 rounded border-input"
                      disabled={excludeSensitive && field.sensitive}
                    />
                    <span className="text-sm">{field.label}</span>
                    {field.sensitive && (
                      <span className="text-xs text-destructive">(sensitive)</span>
                    )}
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No fields defined yet. Go to Settings → Fields to add fields.
                </p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <Label>Auto-exclude sensitive fields</Label>
              <Switch checked={excludeSensitive} onChange={setExcludeSensitive} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show company logo</Label>
              <Switch checked={showLogo} onChange={setShowLogo} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show date</Label>
              <Switch checked={showDate} onChange={setShowDate} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show signature line</Label>
              <Switch checked={showSignature} onChange={setShowSignature} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create Template</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
