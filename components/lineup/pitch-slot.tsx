"use client";

import { Ban, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { UnifiedCard } from "@/lib/kv-types";
import type { CardData } from "@/lib/sorare-api";

import { cn } from "@/lib/utils";

type Card = CardData | UnifiedCard;

/**
 * Restituisce il colore del badge L10 in base al valore
 */
function getL10BadgeColor(l10: number | undefined): {
  bg: string;
  text: string;
} {
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

interface PitchSlotProps {
  label: string;
  card: Card | null;
  isActive: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  onExclude?: () => void;
}

export function PitchSlot({
  label,
  card,
  isActive,
  onSelect,
  onRemove,
  onExclude,
}: PitchSlotProps) {
  const [showActions, setShowActions] = useState(false);

  if (card) {
    // Slot con carta - click seleziona, hover/tap mostra azioni
    return (
      <div
        className="group relative flex flex-col items-center"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Overlay con azioni (hover desktop, tap mobile) */}
        <button
          aria-label={`Azioni per ${card.name}`}
          className={cn(
            "absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/70 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setShowActions(!showActions)}
          type="button"
        >
          {/* Pulsante Escludi */}
          {onExclude && (
            <button
              aria-label="Escludi carta dall'optimizer"
              className="flex items-center gap-2 rounded-lg bg-red-500/80 px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onExclude();
                setShowActions(false);
              }}
              title="Escludi dall'optimizer"
              type="button"
            >
              <Ban className="h-4 w-4" />
              Escludi
            </button>
          )}
          {/* Pulsante Rimuovi */}
          {onRemove && (
            <button
              aria-label="Rimuovi carta dalla lineup"
              className="flex items-center gap-2 rounded-lg bg-slate-500/80 px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-slate-500"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
                setShowActions(false);
              }}
              title="Rimuovi dalla lineup"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Rimuovi
            </button>
          )}
        </button>

        {/* Click area sottostante per selezionare lo slot */}
        <button
          aria-label={`Seleziona slot ${label}`}
          className={cn(
            "relative flex flex-col items-center transition-transform",
            isActive && "scale-105"
          )}
          onClick={onSelect}
          type="button"
        >
          {/* Immagine della carta */}
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

          {/* Banda con L10 e % Titolarità */}
          <div className="flex w-24 items-center justify-center gap-1">
            {/* L10 */}
            {(() => {
              const colors = getL10BadgeColor(card.l10Average);
              return (
                <span
                  className={`inline-flex w-11 items-center justify-center gap-0.5 rounded px-1 py-0.5 font-medium text-[9px] ${colors.bg} ${colors.text}`}
                >
                  <span>📊</span>
                  {card.l10Average ?? "-"}
                </span>
              );
            })()}
            {/* % Titolarità */}
            {card.anyPlayer?.nextClassicFixturePlayingStatusOdds &&
              (() => {
                const starterOdds = Math.round(
                  card.anyPlayer.nextClassicFixturePlayingStatusOdds
                    .starterOddsBasisPoints / 100
                );
                let colorClass = "";
                if (starterOdds < 50) {
                  colorClass = "bg-red-500/20 text-red-400";
                } else if (starterOdds <= 70) {
                  colorClass = "bg-orange-500/20 text-orange-400";
                } else {
                  colorClass = "bg-emerald-500/20 text-emerald-400";
                }
                return (
                  <span
                    className={`inline-flex w-11 items-center justify-center gap-0.5 rounded px-1 py-0.5 font-medium text-[9px] ${colorClass}`}
                  >
                    <span>👕</span>
                    {starterOdds}
                  </span>
                );
              })()}
          </div>
        </button>
      </div>
    );
  }

  // Slot vuoto
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
