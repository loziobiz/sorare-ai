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
        className={`border-white/10 ${viewMode === "grid" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"}`}
        onClick={() => onViewModeChange("grid")}
        size="icon-sm"
        title="Vista griglia"
        variant="outline"
      >
        <Grid />
      </Button>
      <Button
        aria-label="Vista lista"
        className={`border-white/10 ${viewMode === "list" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"}`}
        onClick={() => onViewModeChange("list")}
        size="icon-sm"
        title="Vista lista"
        variant="outline"
      >
        <List />
      </Button>
    </div>
  );
}
