"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { type CompatibilityStatus, useSavedLineupsDnD } from "./dnd-context";

interface DraggableCardProps {
  card: CardData;
  formationId: number;
  slotPosition: string;
  children: React.ReactNode;
}

export function DraggableCard({
  card,
  formationId,
  slotPosition,
  children,
}: DraggableCardProps) {
  const { dragState } = useSavedLineupsDnD();
  const isDragging = dragState.activeItem?.card.slug === card.slug;

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
  } = useDraggable({
    id: `card-${card.slug}`,
    data: {
      card,
      formationId,
      slotPosition,
    },
    disabled: false,
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `drop-${card.slug}`,
    data: {
      card,
      formationId,
      slotPosition,
    },
    disabled: isDragging, // Non permettere drop su se stesso
  });

  const setRefs = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  // Determina lo stato di compatibilità
  const compatibility = dragState.compatibilityMap.get(card.slug);
  const showOverlay =
    dragState.activeItem && dragState.activeItem.card.slug !== card.slug;

  return (
    <div
      className={cn(
        "relative cursor-grab transition-all",
        isDragging && "cursor-grabbing opacity-30",
        isOver && "z-10 scale-105"
      )}
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}

      {/* Overlay compatibilità */}
      {showOverlay && <CompatibilityOverlay status={compatibility} />}
    </div>
  );
}

interface CompatibilityOverlayProps {
  status: CompatibilityStatus | undefined;
}

function CompatibilityOverlay({ status }: CompatibilityOverlayProps) {
  const getOverlayClass = () => {
    switch (status) {
      case "compatible":
        return "bg-emerald-500/30 border-emerald-500";
      case "warning":
        return "bg-amber-500/30 border-amber-500";
      case "incompatible":
        return "bg-rose-500/30 border-rose-500";
      default:
        return "bg-slate-500/20 border-slate-400";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "compatible":
        return "OK";
      case "warning":
        return "CAP";
      case "incompatible":
        return "NO";
      default:
        return null;
    }
  };

  const label = getLabel();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-lg border-2",
        getOverlayClass()
      )}
    >
      {label && (
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "rounded px-2 py-0.5 font-bold text-[10px] text-white shadow-sm",
            status === "compatible" && "bg-emerald-600",
            status === "warning" && "bg-amber-600",
            status === "incompatible" && "bg-rose-600"
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// Componente placeholder per lo slot vuoto durante il drag
interface PlaceholderSlotProps {
  slotPosition: string;
}

export function PlaceholderSlot({ slotPosition }: PlaceholderSlotProps) {
  return (
    <div className="flex w-[85px] flex-col items-center gap-1">
      <div className="flex h-[119px] w-[85px] flex-col items-center justify-center rounded-lg border-2 border-slate-300 border-dashed bg-slate-50">
        <span className="font-medium text-slate-400 text-xs">
          {slotPosition}
        </span>
      </div>
    </div>
  );
}
