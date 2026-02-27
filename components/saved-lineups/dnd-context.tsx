"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { SavedFormation } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";

export type CompatibilityStatus = "compatible" | "warning" | "incompatible";

interface DragItem {
  card: CardData;
  formationId: number;
  slotPosition: string;
}

interface DragState {
  activeItem: DragItem | null;
  compatibilityMap: Map<string, CompatibilityStatus>; // slug -> status
}

interface DnDContextValue {
  dragState: DragState;
  startDrag: (item: DragItem) => void;
  endDrag: () => void;
  updateCompatibility: (formations: SavedFormation[]) => void;
}

const DnDContext = createContext<DnDContextValue | null>(null);

export function useSavedLineupsDnD() {
  const context = useContext(DnDContext);
  if (!context) {
    throw new Error(
      "useSavedLineupsDnD must be used within SavedLineupsDnDProvider"
    );
  }
  return context;
}

interface SavedLineupsDnDProviderProps {
  children: React.ReactNode;
  onSwap: (
    source: { formationId: number; card: CardData; slotPosition: string },
    target: { formationId: number; card: CardData; slotPosition: string }
  ) => void;
}

export function SavedLineupsDnDProvider({
  children,
  onSwap,
}: SavedLineupsDnDProviderProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeItem: null,
    compatibilityMap: new Map(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // minimo 8px di movimento per iniziare il drag
      },
    })
  );

  const startDrag = useCallback((item: DragItem) => {
    setDragState((prev) => ({
      ...prev,
      activeItem: item,
    }));
  }, []);

  const endDrag = useCallback(() => {
    setDragState({
      activeItem: null,
      compatibilityMap: new Map(),
    });
  }, []);

  const updateCompatibility = useCallback((formations: SavedFormation[]) => {
    setDragState((prev) => {
      if (!prev.activeItem) return prev;

      const map = new Map<string, CompatibilityStatus>();
      const { card: draggedCard, slotPosition: sourceSlot } = prev.activeItem;

      for (const formation of formations) {
        for (const card of formation.cards) {
          if (card.slug === draggedCard.slug) continue;

          const targetSlot =
            formation.slots?.find((s) => s.cardSlug === card.slug)?.position ??
            "";

          // Check 1: Compatibilità ruolo (extra è wild card)
          const roleCompatible = isRoleCompatible(
            draggedCard,
            card,
            sourceSlot,
            targetSlot
          );

          if (!roleCompatible) {
            map.set(card.slug, "incompatible");
            continue;
          }

          // Check 2: Compatibilità L10
          const l10Compatible = isL10Compatible(
            draggedCard,
            card,
            sourceSlot,
            targetSlot,
            prev.activeItem.formationId,
            formation.id ?? 0,
            formations
          );

          map.set(card.slug, l10Compatible ? "compatible" : "warning");
        }
      }

      return {
        ...prev,
        compatibilityMap: map,
      };
    });
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current as DragItem;
      startDrag(data);
    },
    [startDrag]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const sourceData = active.data.current as DragItem;
        const targetData = over.data.current as DragItem;

        // Non permettere di rilasciare sulla stessa formazione
        if (sourceData.formationId === targetData.formationId) {
          endDrag();
          return;
        }

        // Verifica finale prima dello swap
        const roleCompatible = isRoleCompatible(
          sourceData.card,
          targetData.card,
          sourceData.slotPosition,
          targetData.slotPosition
        );

        if (roleCompatible) {
          onSwap(
            {
              formationId: sourceData.formationId,
              card: sourceData.card,
              slotPosition: sourceData.slotPosition,
            },
            {
              formationId: targetData.formationId,
              card: targetData.card,
              slotPosition: targetData.slotPosition,
            }
          );
        }
      }

      endDrag();
    },
    [onSwap, endDrag]
  );

  const value = useMemo(
    () => ({
      dragState,
      startDrag,
      endDrag,
      updateCompatibility,
    }),
    [dragState, startDrag, endDrag, updateCompatibility]
  );

  return (
    <DnDContext.Provider value={value}>
      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {children}
        <DragOverlay
          dropAnimation={{
            duration: 150,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}
        >
          {dragState.activeItem ? (
            <div className="rotate-3 scale-105 cursor-grabbing opacity-90 shadow-2xl">
              <img
                alt={dragState.activeItem.card.name}
                className="h-auto w-[85px] rounded-lg"
                src={dragState.activeItem.card.pictureUrl}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </DnDContext.Provider>
  );
}

// ========== Utility Functions ==========

function isRoleCompatible(
  draggedCard: CardData,
  targetCard: CardData,
  sourceSlot: string,
  targetSlot: string
): boolean {
  // Stessa posizione = compatibile
  if (sourceSlot === targetSlot) return true;

  // Extra (EX/EXT) è wild card completo
  if (sourceSlot === "EX" || sourceSlot === "EXT") return true;
  if (targetSlot === "EX" || targetSlot === "EXT") return true;

  // Gruppi di posizioni compatibili
  const positionGroups: Record<string, string[]> = {
    DIF: ["DIF", "DIF1", "DIF2"],
    CEN: ["CEN", "CEN1", "CEN2"],
    ATT: ["ATT", "ATT1"],
    POR: ["POR"],
  };

  // Verifica se le posizioni appartengono allo stesso gruppo
  const sourceGroup = Object.entries(positionGroups).find(([, positions]) =>
    positions.includes(sourceSlot)
  )?.[0];
  const targetGroup = Object.entries(positionGroups).find(([, positions]) =>
    positions.includes(targetSlot)
  )?.[0];

  // Stesso gruppo = compatibile (es: DIF1 può andare in DIF2)
  if (sourceGroup && sourceGroup === targetGroup) return true;

  // Posizioni diverse gruppi = verifica se le carte supportano le posizioni
  return (
    cardSupportsPosition(draggedCard, targetSlot) &&
    cardSupportsPosition(targetCard, sourceSlot)
  );
}

function cardSupportsPosition(card: CardData, position: string): boolean {
  // Mappatura posizioni Sorare alle posizioni generiche
  const positionMapping: Record<string, string[]> = {
    POR: ["Goalkeeper"],
    DIF: ["Defender"],
    DIF1: ["Defender"],
    DIF2: ["Defender"],
    CEN: ["Midfielder"],
    CEN1: ["Midfielder"],
    CEN2: ["Midfielder"],
    ATT: ["Forward"],
    ATT1: ["Forward"],
    EX: ["Forward", "Midfielder", "Defender"],
    EXT: ["Forward", "Midfielder", "Defender"],
  };

  const requiredPositions = positionMapping[position];
  if (!requiredPositions) return false;

  return (
    card.anyPositions?.some((pos) => requiredPositions.includes(pos)) ?? false
  );
}

function isL10Compatible(
  draggedCard: CardData,
  targetCard: CardData,
  sourceSlot: string,
  targetSlot: string,
  sourceFormationId: number,
  targetFormationId: number,
  formations: SavedFormation[]
): boolean {
  const sourceFormation = formations.find((f) => f.id === sourceFormationId);
  const targetFormation = formations.find((f) => f.id === targetFormationId);

  if (!(sourceFormation && targetFormation)) return false;

  // Helper per calcolare L10 totale di una formazione dopo lo scambio
  const calculateNewL10 = (
    formation: SavedFormation,
    outCard: CardData,
    inCard: CardData
  ): number => {
    const currentL10 = formation.cards.reduce(
      (sum, c) => sum + (c.l10Average ?? 0),
      0
    );
    return currentL10 - (outCard.l10Average ?? 0) + (inCard.l10Average ?? 0);
  };

  // Helper per ottenere il CAP
  const getCap = (formation: SavedFormation): number | null => {
    const modeLabels: Record<string, number | null> = {
      uncapped: null,
      "260": 260,
      "220": 220,
      pro_gas: null,
    };
    return modeLabels[formation.gameMode] ?? 260;
  };

  // Check formazione sorgente: rimuove dragged, aggiunge target
  const sourceNewL10 = calculateNewL10(
    sourceFormation,
    draggedCard,
    targetCard
  );
  const sourceCap = getCap(sourceFormation);

  // Check formazione target: rimuove target, aggiunge dragged
  const targetNewL10 = calculateNewL10(
    targetFormation,
    targetCard,
    draggedCard
  );
  const targetCap = getCap(targetFormation);

  // Se almeno una supera il CAP, return false (warning)
  const sourceOk = sourceCap === null || sourceNewL10 <= sourceCap;
  const targetOk = targetCap === null || targetNewL10 <= targetCap;

  return sourceOk && targetOk;
}
