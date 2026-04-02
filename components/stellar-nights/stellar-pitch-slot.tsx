"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { StellarFlatCard } from "@/lib/stellar/types";
import { cn } from "@/lib/utils";

function getL10BadgeColor(l10: number | null): { bg: string; text: string } {
  if (!l10 || l10 === 0) {
    return { bg: "bg-white/10", text: "text-slate-400" };
  }
  if (l10 <= 30) {
    return { bg: "bg-red-500/20", text: "text-red-400" };
  }
  if (l10 <= 40) {
    return { bg: "bg-orange-500/20", text: "text-orange-400" };
  }
  if (l10 <= 59) {
    return { bg: "bg-lime-500/20", text: "text-lime-400" };
  }
  if (l10 <= 79) {
    return { bg: "bg-emerald-500/20", text: "text-emerald-400" };
  }
  return { bg: "bg-cyan-500/20", text: "text-cyan-400" };
}

interface StellarPitchSlotProps {
  label: string;
  card: StellarFlatCard | null;
  isActive: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}

function FilledSlot({
  label,
  card,
  isActive,
  onSelect,
  onRemove,
}: StellarPitchSlotProps & { card: StellarFlatCard }) {
  const [showActions, setShowActions] = useState(false);
  const colors = getL10BadgeColor(card.l10Average);

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover effect only, matches lineup/pitch-slot pattern
    // biome-ignore lint/a11y/noStaticElementInteractions: hover effect only
    <div
      className="group relative flex flex-col items-center"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {onRemove && (
        <button
          aria-label={`Azioni per ${card.name}`}
          className={cn(
            "absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-black/70 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setShowActions(!showActions)}
          type="button"
        >
          <button
            aria-label="Rimuovi carta"
            className="flex items-center gap-2 rounded-lg bg-slate-500/80 px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-slate-500"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
              setShowActions(false);
            }}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Rimuovi
          </button>
        </button>
      )}

      <button
        aria-label={`Seleziona slot ${label}`}
        className={cn(
          "relative flex flex-col items-center transition-transform",
          isActive && "scale-105"
        )}
        onClick={onSelect}
        type="button"
      >
        {card.pictureUrl ? (
          <img
            alt={card.name}
            className="h-40 w-24 rounded-lg object-cover shadow-lg"
            height={160}
            loading="lazy"
            src={card.pictureUrl}
            width={96}
          />
        ) : (
          <div className="flex h-40 w-24 items-center justify-center rounded-lg bg-slate-700 font-bold text-white shadow-lg">
            {card.name.charAt(0)}
          </div>
        )}

        <div className="flex w-24 items-center justify-center gap-1">
          <span
            className={`inline-flex w-11 items-center justify-center gap-0.5 rounded px-1 py-0.5 font-medium text-[9px] ${colors.bg} ${colors.text}`}
          >
            <span>📊</span>
            {card.l10Average == null ? "-" : card.l10Average.toFixed(0)}
          </span>
          {card.projectedScore != null && (
            <span className="inline-flex w-11 items-center justify-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 font-medium text-[9px] text-emerald-400">
              <span>🎯</span>
              {card.projectedScore.toFixed(0)}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

export function StellarPitchSlot({
  label,
  card,
  isActive,
  onSelect,
  onRemove,
}: StellarPitchSlotProps) {
  if (card) {
    return (
      <FilledSlot
        card={card}
        isActive={isActive}
        label={label}
        onRemove={onRemove}
        onSelect={onSelect}
      />
    );
  }

  return (
    <button
      aria-label={`Seleziona ${label}`}
      className={cn(
        "group flex flex-col items-center transition-transform hover:scale-105",
        isActive && "scale-105"
      )}
      onClick={onSelect}
      type="button"
    >
      <div
        className={cn(
          "flex h-40 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          isActive
            ? "border-violet-400 bg-violet-500/20"
            : "border-white/40 bg-white/10 hover:border-white/60 hover:bg-white/20"
        )}
      >
        <span
          className={cn(
            "mb-2 font-semibold text-sm",
            isActive ? "text-violet-200" : "text-white/70"
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed transition-colors",
            isActive
              ? "border-violet-300 text-violet-200"
              : "border-white/40 text-white/50 group-hover:border-white/60"
          )}
        >
          <Plus className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}
