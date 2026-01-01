"use client";

import { Plus, X } from "lucide-react";
import Image from "next/image";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";

interface PitchSlotProps {
  label: string;
  card: CardData | null;
  isActive: boolean;
  onClick: () => void;
}

export function PitchSlot({ label, card, isActive, onClick }: PitchSlotProps) {
  if (card) {
    // Slot con carta - mostra solo l'immagine
    return (
      <button
        aria-label={`Rimuovi ${card.name}`}
        className="group relative transition-transform hover:scale-105"
        onClick={onClick}
        type="button"
      >
        {/* Icona rimuovi al hover */}
        <div className="absolute top-1 right-1 z-20 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
          <X className="h-4 w-4 text-white" />
        </div>

        {/* Immagine della carta */}
        {card.pictureUrl ? (
          <Image
            alt={card.name}
            className="h-50 w-32 rounded-lg object-cover shadow-lg"
            height={176}
            src={card.pictureUrl}
            unoptimized
            width={128}
          />
        ) : (
          <div className="flex h-44 w-32 items-center justify-center rounded-lg bg-slate-700 font-bold text-white text-xl shadow-lg">
            {card.name.charAt(0)}
          </div>
        )}
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
          "flex h-44 w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
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
