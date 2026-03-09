"use client";

import { useState } from "react";
import { Bookmark, Plus, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useRecordStore } from "@/stores/record-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { SavedView } from "@/types/filter";

export function SavedViews() {
  const { savedViews, activeView, setActiveView, activeFilters, activeSort } =
    useRecordStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [viewName, setViewName] = useState("");

  function handleSaveView() {
    if (!viewName.trim()) return;

    // TODO: Save to Firestore
    const newView: SavedView = {
      id: `view_${Date.now()}`,
      name: viewName,
      filters: activeFilters,
      sort: activeSort,
      columns: [],
      created_by: "",
      shared: false,
      pinned: false,
      created_at: new Date().toISOString(),
    };

    setShowSaveModal(false);
    setViewName("");
  }

  return (
    <div className="flex items-center gap-2">
      {/* All records button */}
      <button
        onClick={() => setActiveView(null)}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          !activeView
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        All
      </button>

      {/* Saved views */}
      {savedViews.map((view) => (
        <button
          key={view.id}
          onClick={() => setActiveView(view)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            activeView?.id === view.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Bookmark className="h-3 w-3" />
          {view.name}
        </button>
      ))}

      {/* Save current view */}
      {activeFilters.filters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSaveModal(true)}
          className="text-muted-foreground"
        >
          <Plus className="mr-1 h-3 w-3" />
          Save View
        </Button>
      )}

      {/* Save view modal */}
      <Modal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save View"
        description="Save your current filters as a reusable view"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            placeholder="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSaveModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveView}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
