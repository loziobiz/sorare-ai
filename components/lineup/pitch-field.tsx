"use client";

import type { FormationSlot, GameMode, SlotPosition } from "./lineup-builder";
import { PitchSlot } from "./pitch-slot";

interface PitchFieldProps {
  gameMode: GameMode;
  formation: FormationSlot[];
  activeSlot: SlotPosition | null;
  onSlotClick: (position: SlotPosition) => void;
}

export function PitchField({
  gameMode,
  formation,
  activeSlot,
  onSlotClick,
}: PitchFieldProps) {
  const isProGas = gameMode === "pro_gas";

  return (
    <div className="relative flex aspect-[21/31] flex-col overflow-hidden rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-lg">
      {/* Linee del campo */}
      <div className="absolute inset-5 rounded-lg border-2 border-white/30" />
      <div className="absolute top-1/2 right-5 left-5 h-0.5 -translate-y-1/2 bg-white/30" />
      <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
      <div className="absolute bottom-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-b-0" />
      <div className="absolute top-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-t-0" />

      {/* Slot posizioni */}
      <div className="relative z-10 flex h-full flex-col justify-between gap-2 px-4 py-3">
        {isProGas ? (
          <>
            {/* Pro GAS: ATT1-CEN2-EXT / DIF1-CEN1-DIF2 / POR */}
            {/* Riga alta - ATT1, CEN2, EXT */}
            <div className="flex justify-around">
              <PitchSlot
                card={
                  formation.find((s) => s.position === "ATT1")?.card ?? null
                }
                isActive={activeSlot === "ATT1"}
                label="ATT1"
                onClick={() => onSlotClick("ATT1")}
              />
              <PitchSlot
                card={
                  formation.find((s) => s.position === "CEN2")?.card ?? null
                }
                isActive={activeSlot === "CEN2"}
                label="CEN2"
                onClick={() => onSlotClick("CEN2")}
              />
              <PitchSlot
                card={formation.find((s) => s.position === "EXT")?.card ?? null}
                isActive={activeSlot === "EXT"}
                label="EXT"
                onClick={() => onSlotClick("EXT")}
              />
            </div>

            {/* Riga centrale - DIF1, CEN1, DIF2 */}
            <div className="flex justify-around">
              <PitchSlot
                card={
                  formation.find((s) => s.position === "DIF1")?.card ?? null
                }
                isActive={activeSlot === "DIF1"}
                label="DIF1"
                onClick={() => onSlotClick("DIF1")}
              />
              <PitchSlot
                card={
                  formation.find((s) => s.position === "CEN1")?.card ?? null
                }
                isActive={activeSlot === "CEN1"}
                label="CEN1"
                onClick={() => onSlotClick("CEN1")}
              />
              <PitchSlot
                card={
                  formation.find((s) => s.position === "DIF2")?.card ?? null
                }
                isActive={activeSlot === "DIF2"}
                label="DIF2"
                onClick={() => onSlotClick("DIF2")}
              />
            </div>

            {/* Riga bassa - POR */}
            <div className="flex justify-center">
              <PitchSlot
                card={formation.find((s) => s.position === "POR")?.card ?? null}
                isActive={activeSlot === "POR"}
                label="POR"
                onClick={() => onSlotClick("POR")}
              />
            </div>
          </>
        ) : (
          <>
            {/* Standard: 2-2-1 */}
            {/* Riga alta - ATT ed EX */}
            <div className="flex justify-around">
              <PitchSlot
                card={formation.find((s) => s.position === "ATT")?.card ?? null}
                isActive={activeSlot === "ATT"}
                label="ATT"
                onClick={() => onSlotClick("ATT")}
              />
              <PitchSlot
                card={formation.find((s) => s.position === "EX")?.card ?? null}
                isActive={activeSlot === "EX"}
                label="EX"
                onClick={() => onSlotClick("EX")}
              />
            </div>

            {/* Riga centrale - DIF e CEN */}
            <div className="flex justify-around">
              <PitchSlot
                card={formation.find((s) => s.position === "DIF")?.card ?? null}
                isActive={activeSlot === "DIF"}
                label="DIF"
                onClick={() => onSlotClick("DIF")}
              />
              <PitchSlot
                card={formation.find((s) => s.position === "CEN")?.card ?? null}
                isActive={activeSlot === "CEN"}
                label="CEN"
                onClick={() => onSlotClick("CEN")}
              />
            </div>

            {/* Riga bassa - POR */}
            <div className="flex justify-center">
              <PitchSlot
                card={formation.find((s) => s.position === "POR")?.card ?? null}
                isActive={activeSlot === "POR"}
                label="POR"
                onClick={() => onSlotClick("POR")}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
