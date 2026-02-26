"use client";

import type { SortingState, Updater } from "@tanstack/react-table";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { CardData } from "@/lib/sorare-api";
import { getDashboardColumns, getLineupColumns } from "./columns";
import { DataTable } from "./data-table";

export type { LineupColumnOptions } from "./columns";
// biome-ignore lint/performance/noBarrelFile: Retrocompatibilità
export {
  DASHBOARD_COLUMN_WIDTHS,
  getDashboardColumns,
  getLeagueName,
  getLineupColumns,
  getPlayerName,
  getPriceDisplay,
  getScoreColor,
  getTeamName,
  getXP,
  LINEUP_COLUMN_WIDTHS,
  ScoreHistogram,
} from "./columns";
export { getSortIcon } from "./data-table";

// Costanti per retrocompatibilità (deprecated, usare LINEUP_COLUMN_WIDTHS)
export const COLUMN_WIDTHS = {
  name: 310,
  team: 240,
  match: 80,
  spacer: 20,
  forma: 120,
  l5: 50,
  l10: 50,
  l40: 50,
} as const;

export const COLUMN_WIDTHS_STANDALONE = {
  name: 200,
  team: 300,
  forma: 90,
  price: 400,
  l5: 50,
  l10: 50,
  l40: 50,
} as const;

// Types per retrocompatibilità
export interface ColumnWidths {
  name: number;
  team: number;
  match?: number;
  forma: number;
  price?: number;
  l5: number;
  l10: number;
  l40: number;
}

export type SortKey = "name" | "team" | "l5" | "l10" | "l40";
export type SortDirection = "asc" | "desc";

export interface CardsListProps {
  cards: CardData[];
  showEmptyMessage?: boolean;
  emptyMessage?: string;
  onCardClick?: (card: CardData) => void;
  disabled?: boolean;
  showHeader?: boolean;
  sortKey?: SortKey;
  sortDirection?: SortDirection;
  onSort?: (key: SortKey, direction: SortDirection) => void;
  columnWidths?: ColumnWidths; // deprecated, non più usato
  markedCards?: Map<string, string>;
  mode?: "lineup" | "dashboard";
  l10Remaining?: number;
}

function convertSortKey(key: SortKey): string {
  const mapping: Record<SortKey, string> = {
    name: "name",
    team: "team",
    l5: "l5Average",
    l10: "l10Average",
    l40: "l40Average",
  };
  return mapping[key];
}

function convertSortState(
  sortKey?: SortKey,
  sortDirection?: SortDirection
): SortingState {
  if (!sortKey) {
    return [];
  }
  return [
    {
      id: convertSortKey(sortKey),
      desc: sortDirection === "desc",
    },
  ];
}

export function CardsList({
  cards,
  showEmptyMessage = true,
  emptyMessage = "No cards found",
  onCardClick,
  disabled = false,
  sortKey,
  sortDirection,
  onSort,
  markedCards,
  mode = "lineup",
  l10Remaining,
}: CardsListProps) {
  const columns = useMemo(() => {
    if (mode === "dashboard") {
      return getDashboardColumns();
    }
    return getLineupColumns({ markedCards, l10Remaining });
  }, [mode, markedCards, l10Remaining]);

  const sorting = useMemo(
    () => convertSortState(sortKey, sortDirection),
    [sortKey, sortDirection]
  );

  const handleSortingChange = (updaterOrValue: Updater<SortingState>) => {
    if (!onSort) {
      return;
    }

    const newSorting =
      typeof updaterOrValue === "function"
        ? updaterOrValue(sorting)
        : updaterOrValue;
    const firstSort = newSorting[0];
    if (!firstSort) {
      // Sorting reset - mantieni l'ultimo stato o resetta
      return;
    }

    const reverseMapping: Record<string, SortKey> = {
      name: "name",
      team: "team",
      l5Average: "l5",
      l10Average: "l10",
      l40Average: "l40",
    };

    const newKey = reverseMapping[firstSort.id];
    if (newKey) {
      onSort(newKey, firstSort.desc ? "desc" : "asc");
    }
  };

  if (cards.length === 0 && showEmptyMessage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={cards}
      disabled={disabled}
      emptyMessage={emptyMessage}
      enableSorting={!!onSort}
      onRowClick={onCardClick}
      onSortingChange={handleSortingChange}
      showEmptyMessage={showEmptyMessage}
      sorting={sorting}
    />
  );
}
