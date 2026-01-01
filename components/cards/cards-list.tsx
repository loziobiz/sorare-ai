"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPositionLabel } from "@/lib/cards-utils";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { CardThumbnail } from "./card-thumbnail";

export interface CardsListProps {
  cards: CardData[];
  showEmptyMessage?: boolean;
  emptyMessage?: string;
  onCardClick?: (card: CardData) => void;
  disabled?: boolean;
}

type SortKey = "name" | "team" | "league" | "l5" | "l15" | "l40" | "xp";
type SortDirection = "asc" | "desc";

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

export function CardsList({
  cards,
  showEmptyMessage = true,
  emptyMessage,
  onCardClick,
  disabled = false,
}: CardsListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (columnKey: SortKey) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-1 inline-block h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 inline-block h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 inline-block h-4 w-4" />
    );
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
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center">
                Giocatore
                {getSortIcon("name")}
              </div>
            </TableHead>
            <TableHead
              className="max-w-[300px] cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("team")}
            >
              <div className="flex items-center">
                Squadra
                {getSortIcon("team")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("league")}
            >
              <div className="flex items-center">
                Lega
                {getSortIcon("league")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("l5")}
            >
              <div className="flex items-center">
                L5
                {getSortIcon("l5")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("l15")}
            >
              <div className="flex items-center">
                L15
                {getSortIcon("l15")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("l40")}
            >
              <div className="flex items-center">
                L40
                {getSortIcon("l40")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:bg-muted/80"
              onClick={() => handleSort("xp")}
            >
              <div className="flex items-center">
                XP
                {getSortIcon("xp")}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
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
              <TableCell>
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
              <TableCell className="max-w-[300px] truncate">
                {getTeamName(card)}
              </TableCell>
              <TableCell>{getLeagueName(card)}</TableCell>
              <TableCell>
                <div className="font-medium">
                  {card.l5Average?.toFixed(1) ?? "-"}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {card.l15Average?.toFixed(1) ?? "-"}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {card.l40Average?.toFixed(1) ?? "-"}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{getXP(card) || "-"}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
