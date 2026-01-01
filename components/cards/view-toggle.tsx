"use client";

import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={viewMode === "grid" ? "default" : "outline"}
        size="icon-sm"
        onClick={() => onViewModeChange("grid")}
        aria-label="Vista griglia"
        title="Vista griglia"
      >
        <Grid />
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "outline"}
        size="icon-sm"
        onClick={() => onViewModeChange("list")}
        aria-label="Vista lista"
        title="Vista lista"
      >
        <List />
      </Button>
    </div>
  );
}
