"use client";

import { Calendar, Home, Plane, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { StellarFlatCard } from "@/lib/stellar/types";
import { cn } from "@/lib/utils";

const SHORT_DAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

const POSITION_ABBR: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DF",
  Midfielder: "MD",
  Forward: "FW",
};

function formatGameDay(isoDate: string): string {
  const d = new Date(isoDate);
  const day = SHORT_DAYS[d.getDay()];
  const date = d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${date} ${time}`;
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

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover effect only, matches lineup/pitch-slot pattern
    // biome-ignore lint/a11y/noStaticElementInteractions: hover effect only
    <div
      className="group relative"
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
          "flex w-full gap-2 rounded-lg border bg-[#1E1F2A] p-2 text-left transition-colors",
          isActive ? "border-violet-500/40 bg-[#252636]" : "border-white/10"
        )}
        onClick={onSelect}
        type="button"
      >
        {card.pictureUrl ? (
          <img
            alt={card.name}
            className="h-20 w-14 shrink-0 rounded object-cover"
            height={80}
            loading="lazy"
            src={card.pictureUrl}
            width={56}
          />
        ) : (
          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-white/5 font-bold text-white">
            {card.name.charAt(0)}
          </div>
        )}

        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-medium text-white text-xs">
            {card.playerName}
          </p>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="rounded bg-violet-500/20 px-1 py-0.5 text-violet-300">
              {card.positions.map((p) => POSITION_ABBR[p] ?? p).join("/")}
            </span>
            <span className="truncate text-slate-500">{card.clubName}</span>
          </div>
          <div className="flex gap-1.5 text-[10px]">
            <span className="text-slate-400">
              L10:{" "}
              <span className="text-white">
                {card.l10Average == null ? "-" : card.l10Average.toFixed(0)}
              </span>
            </span>
            <span className="text-slate-400">
              P:{" "}
              <span className="text-emerald-400">
                {card.projectedScore == null
                  ? "-"
                  : card.projectedScore.toFixed(0)}
              </span>
            </span>
            <span className="text-slate-400">
              T:{" "}
              <span className="text-amber-400">
                {card.starterOdds == null
                  ? "-"
                  : `${card.starterOdds.toFixed(0)}%`}
              </span>
            </span>
          </div>
          {card.nextGameDate && (
            <div className="space-y-0.5 text-[9px] text-slate-500">
              <div className="flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5 shrink-0" />
                {formatGameDay(card.nextGameDate)}
              </div>
              {card.nextGameOpponent && (
                <div className="flex items-center gap-0.5">
                  {card.nextGameOpponent.startsWith("vs") ? (
                    <Home className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Plane className="h-2.5 w-2.5 shrink-0 text-orange-400" />
                  )}
                  {card.nextGameOpponent}
                </div>
              )}
            </div>
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
          "flex h-20 w-full flex-row items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 transition-all",
          isActive
            ? "border-violet-400 bg-violet-500/20"
            : "border-white/40 bg-white/10 hover:border-white/60 hover:bg-white/20"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed transition-colors",
            isActive
              ? "border-violet-300 text-violet-200"
              : "border-white/40 text-white/50 group-hover:border-white/60"
          )}
        >
          <Plus className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "font-semibold text-sm",
            isActive ? "text-violet-200" : "text-white/70"
          )}
        >
          {label}
        </span>
      </div>
    </button>
  );
}
