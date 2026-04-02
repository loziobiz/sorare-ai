"use client";

import type { StellarFlatCard } from "@/lib/stellar/types";
import { StellarPitchSlot } from "./stellar-pitch-slot";

export type StellarSlotPosition = "ATT" | "EX" | "DIF" | "CEN" | "POR";

export interface StellarFormationSlot {
  position: StellarSlotPosition;
  card: StellarFlatCard | null;
}

export const STELLAR_POSITION_MAPPING: Record<StellarSlotPosition, string[]> = {
  ATT: ["Forward"],
  EX: ["Forward", "Midfielder", "Defender"],
  DIF: ["Defender"],
  CEN: ["Midfielder"],
  POR: ["Goalkeeper"],
};

export const STELLAR_SLOT_ORDER: StellarSlotPosition[] = [
  "POR",
  "DIF",
  "CEN",
  "ATT",
  "EX",
];

interface StellarPitchFieldProps {
  formation: StellarFormationSlot[];
  activeSlot: StellarSlotPosition | null;
  onSlotSelect: (position: StellarSlotPosition) => void;
  onCardRemove?: (position: StellarSlotPosition) => void;
}

export function StellarPitchField({
  formation,
  activeSlot,
  onSlotSelect,
  onCardRemove,
}: StellarPitchFieldProps) {
  return (
    <div className="relative flex aspect-[21/31] flex-col overflow-hidden rounded-xl border border-white/5 bg-[#2d6a4f] shadow-2xl shadow-violet-900/20">
      {/* Linee del campo */}
      <div className="absolute inset-3 rounded-lg border-2 border-white/30" />
      <div className="absolute top-1/2 right-3 left-3 h-0.5 -translate-y-1/2 bg-white/30" />
      <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
      <div className="absolute bottom-3 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-b-0" />
      <div className="absolute top-3 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-t-0" />

      <div className="relative z-10 flex h-full flex-col justify-between gap-2 px-2 py-2">
        {/* ATT ed EX */}
        <div className="flex gap-2">
          <StellarPitchSlot
            card={formation.find((s) => s.position === "ATT")?.card ?? null}
            isActive={activeSlot === "ATT"}
            label="ATT"
            onRemove={() => onCardRemove?.("ATT")}
            onSelect={() => onSlotSelect("ATT")}
          />
          <StellarPitchSlot
            card={formation.find((s) => s.position === "EX")?.card ?? null}
            isActive={activeSlot === "EX"}
            label="EX"
            onRemove={() => onCardRemove?.("EX")}
            onSelect={() => onSlotSelect("EX")}
          />
        </div>

        {/* DIF e CEN */}
        <div className="flex gap-2">
          <StellarPitchSlot
            card={formation.find((s) => s.position === "DIF")?.card ?? null}
            isActive={activeSlot === "DIF"}
            label="DIF"
            onRemove={() => onCardRemove?.("DIF")}
            onSelect={() => onSlotSelect("DIF")}
          />
          <StellarPitchSlot
            card={formation.find((s) => s.position === "CEN")?.card ?? null}
            isActive={activeSlot === "CEN"}
            label="CEN"
            onRemove={() => onCardRemove?.("CEN")}
            onSelect={() => onSlotSelect("CEN")}
          />
        </div>

        {/* POR */}
        <div className="flex justify-center px-[25%]">
          <StellarPitchSlot
            card={formation.find((s) => s.position === "POR")?.card ?? null}
            isActive={activeSlot === "POR"}
            label="POR"
            onRemove={() => onCardRemove?.("POR")}
            onSelect={() => onSlotSelect("POR")}
          />
        </div>
      </div>
    </div>
  );
}
