"use client";

import { Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2">
      <Button
        aria-label="Vista griglia"
        onClick={() => onViewModeChange("grid")}
        size="icon-sm"
        title="Vista griglia"
        variant={viewMode === "grid" ? "default" : "outline"}
      >
        <Grid />
      </Button>
      <Button
        aria-label="Vista lista"
        onClick={() => onViewModeChange("list")}
        size="icon-sm"
        title="Vista lista"
        variant={viewMode === "list" ? "default" : "outline"}
      >
        <List />
      </Button>
    </div>
  );
}
