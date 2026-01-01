"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { getPositionLabel } from "@/lib/cards-utils";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { CardThumbnail } from "./card-thumbnail";

// Larghezze fisse delle colonne per lineup-builder
export const COLUMN_WIDTHS = {
  name: 300,
  team: 300,
  league: 190,
  l5: 60,
  l15: 60,
  l40: 60,
  xp: 60,
} as const;

// Larghezze fisse delle colonne per cards-dashboard (standalone)
export const COLUMN_WIDTHS_STANDALONE = {
  name: 35,
  team: 430,
  league: 220,
  l5: 60,
  l15: 60,
  l40: 60,
  xp: 60,
} as const;

export interface ColumnWidths {
  name: number;
  team: number;
  league: number;
  l5: number;
  l15: number;
  l40: number;
  xp: number;
}
export type SortKey = "name" | "team" | "league" | "l5" | "l15" | "l40" | "xp";
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
  columnWidths?: ColumnWidths;
}

// Regex per estrarre solo il nome del giocatore (rimuove anno e info carta)
const PLAYER_NAME_REGEX = /^(.+?)\s+\d{4}-\d{2}/;

function getPlayerName(card: CardData): string {
  // Rimuove le informazioni extra come "2021-22 • Limited 246/1000"
  // Pattern: "Nome Giocatore Anno-Anno • Tipo Numero/Totale"
  const name = card.name;
  const match = name.match(PLAYER_NAME_REGEX);
  return match ? match[1] : name;
}

function getLeagueName(card: CardData): string {
  if (!card.anyPlayer?.activeClub?.activeCompetitions) {
    return "-";
  }
  const league = card.anyPlayer.activeClub.activeCompetitions.find(
    (c) => c.format === "DOMESTIC_LEAGUE"
  );
  return (
    league?.name ?? card.anyPlayer.activeClub.activeCompetitions[0]?.name ?? "-"
  );
}

function getTeamName(card: CardData): string {
  return card.anyPlayer?.activeClub?.name ?? "-";
}

function getXP(card: CardData): number {
  if (!card.power) {
    return 0;
  }
  return Math.round((Number.parseFloat(card.power) - 1) * 100);
}

function compareValues(
  a: unknown,
  b: unknown,
  direction: SortDirection
): number {
  if (a === b) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }

  let comparison = 0;
  if (typeof a === "string" && typeof b === "string") {
    comparison = a.localeCompare(b);
  } else if (typeof a === "number" && typeof b === "number") {
    comparison = a - b;
  } else {
    comparison = String(a).localeCompare(String(b));
  }

  return direction === "asc" ? comparison : -comparison;
}

export function getSortIcon(
  columnKey: SortKey,
  currentSortKey: SortKey,
  currentSortDirection: SortDirection
) {
  if (currentSortKey !== columnKey) {
    return <ArrowUpDown className="ml-1 inline-block h-4 w-4" />;
  }
  return currentSortDirection === "asc" ? (
    <ArrowUp className="ml-1 inline-block h-4 w-4" />
  ) : (
    <ArrowDown className="ml-1 inline-block h-4 w-4" />
  );
}

export function CardsList({
  cards,
  showEmptyMessage = true,
  emptyMessage,
  onCardClick,
  disabled = false,
  showHeader = true,
  sortKey: externalSortKey,
  sortDirection: externalSortDirection,
  onSort,
  columnWidths = COLUMN_WIDTHS,
}: CardsListProps) {
  const [internalSortKey, setInternalSortKey] = useState<SortKey>("name");
  const [internalSortDirection, setInternalSortDirection] =
    useState<SortDirection>("asc");

  // Usa props esterne se fornite, altrimenti stato interno
  const sortKey = externalSortKey ?? internalSortKey;
  const sortDirection = externalSortDirection ?? internalSortDirection;

  // Usa le larghezze delle colonne passate come prop
  const widths = columnWidths;

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return compareValues(
            getPlayerName(a),
            getPlayerName(b),
            sortDirection
          );
        case "team":
          return compareValues(getTeamName(a), getTeamName(b), sortDirection);
        case "league":
          return compareValues(
            getLeagueName(a),
            getLeagueName(b),
            sortDirection
          );
        case "l5":
          return compareValues(
            a.l5Average ?? 0,
            b.l5Average ?? 0,
            sortDirection
          );
        case "l15":
          return compareValues(
            a.l15Average ?? 0,
            b.l15Average ?? 0,
            sortDirection
          );
        case "l40":
          return compareValues(
            a.l40Average ?? 0,
            b.l40Average ?? 0,
            sortDirection
          );
        case "xp":
          return compareValues(getXP(a), getXP(b), sortDirection);
        default:
          return 0;
      }
    });
  }, [cards, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    let newDirection: SortDirection = "asc";
    if (sortKey === key) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }

    if (onSort) {
      onSort(key, newDirection);
    } else {
      setInternalSortKey(key);
      setInternalSortDirection(newDirection);
    }
  };

  const renderSortIcon = (columnKey: SortKey) => {
    return getSortIcon(columnKey, sortKey, sortDirection);
  };

  if (cards.length === 0 && showEmptyMessage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage ?? "No cards found"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        {showHeader && (
          <thead className="sticky top-0 z-10 bg-white shadow-sm [&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("name")}
                style={{ width: widths.name }}
              >
                <div className="flex items-center">
                  Giocatore
                  {renderSortIcon("name")}
                </div>
              </th>
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("team")}
                style={{ width: widths.team }}
              >
                <div className="flex items-center">
                  Squadra
                  {renderSortIcon("team")}
                </div>
              </th>
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("league")}
                style={{ width: widths.league }}
              >
                <div className="flex items-center">
                  Lega
                  {renderSortIcon("league")}
                </div>
              </th>
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("l5")}
                style={{ width: widths.l5 }}
              >
                <div className="flex items-center">
                  L5
                  {renderSortIcon("l5")}
                </div>
              </th>
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("l15")}
                style={{ width: widths.l15 }}
              >
                <div className="flex items-center">
                  L15
                  {renderSortIcon("l15")}
                </div>
              </th>
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("l40")}
                style={{ width: widths.l40 }}
              >
                <div className="flex items-center">
                  L40
                  {renderSortIcon("l40")}
                </div>
              </th>
              <th
                className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                onClick={() => handleSort("xp")}
                style={{ width: widths.xp }}
              >
                <div className="flex items-center">
                  XP
                  {renderSortIcon("xp")}
                </div>
              </th>
            </tr>
          </thead>
        )}
        <TableBody>
          {sortedCards.map((card) => (
            <TableRow
              className={cn(
                onCardClick && !disabled && "cursor-pointer hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              key={card.slug}
              onClick={() => {
                if (onCardClick && !disabled) {
                  onCardClick(card);
                }
              }}
            >
              <TableCell style={{ width: widths.name }}>
                <div className="flex items-center gap-3">
                  {card.pictureUrl && (
                    <CardThumbnail
                      alt={card.name}
                      size={48}
                      src={card.pictureUrl}
                    />
                  )}
                  <div className="flex flex-col">
                    <div className="font-medium">{getPlayerName(card)}</div>
                    {card.anyPositions && card.anyPositions.length > 0 && (
                      <div className="text-muted-foreground text-xs">
                        {card.anyPositions
                          .map((pos) => getPositionLabel(pos))
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="truncate" style={{ width: widths.team }}>
                {getTeamName(card)}
              </TableCell>
              <TableCell style={{ width: widths.league }}>
                {getLeagueName(card)}
              </TableCell>
              <TableCell style={{ width: widths.l5 }}>
                <div className="font-medium">
                  {card.l5Average?.toFixed(1) ?? "-"}
                </div>
              </TableCell>
              <TableCell style={{ width: widths.l15 }}>
                <div className="font-medium">
                  {card.l15Average?.toFixed(1) ?? "-"}
                </div>
              </TableCell>
              <TableCell style={{ width: widths.l40 }}>
                <div className="font-medium">
                  {card.l40Average?.toFixed(1) ?? "-"}
                </div>
              </TableCell>
              <TableCell style={{ width: widths.xp }}>
                <div className="pr-3 text-right font-medium">
                  {getXP(card) || "-"} %
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
