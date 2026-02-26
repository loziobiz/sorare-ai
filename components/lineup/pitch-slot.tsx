"use client";

import { Plus, X } from "lucide-react";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";

/**
 * Restituisce il colore del badge L10 in base al valore
 */
function getL10BadgeColor(l10: number | undefined): {
  bg: string;
  text: string;
} {
  if (!l10 || l10 === 0) {
    return { bg: "bg-slate-100", text: "text-slate-500" };
  }
  if (l10 <= 30) {
    return { bg: "bg-rose-100", text: "text-rose-700" };
  }
  if (l10 <= 40) {
    return { bg: "bg-orange-100", text: "text-orange-700" };
  }
  if (l10 <= 59) {
    return { bg: "bg-lime-100", text: "text-lime-700" };
  }
  if (l10 <= 79) {
    return { bg: "bg-emerald-100", text: "text-emerald-700" };
  }
  return { bg: "bg-cyan-100", text: "text-cyan-700" };
}

interface PitchSlotProps {
  label: string;
  card: CardData | null;
  isActive: boolean;
  onClick: () => void;
}

export function PitchSlot({ label, card, isActive, onClick }: PitchSlotProps) {
  if (card) {
    // Slot con carta - mostra l'immagine e la banda con L10 e % titolarità
    return (
      <button
        aria-label={`Rimuovi ${card.name}`}
        className="group relative flex flex-col items-center transition-transform hover:scale-105"
        onClick={onClick}
        type="button"
      >
        {/* Icona rimuovi al hover */}
        <div className="absolute top-1 right-1 z-20 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
          <X className="h-4 w-4 text-white" />
        </div>

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
                {card.l10Average?.toFixed(0) ?? "-"}
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
                colorClass = "bg-red-100 text-red-700";
              } else if (starterOdds <= 70) {
                colorClass = "bg-amber-100 text-amber-700";
              } else {
                colorClass = "bg-emerald-100 text-emerald-700";
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
      onClick={onClick}
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
