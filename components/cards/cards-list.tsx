"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { getPositionLabel } from "@/lib/cards-utils";
import { ETH_TO_EUR_RATE } from "@/lib/config";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { CardThumbnail } from "./card-thumbnail";
import { NextMatchBlock } from "./next-match-block";

// Larghezze fisse delle colonne per lineup-builder
export const COLUMN_WIDTHS = {
  name: 200,
  team: 200,
  match: 120,
  forma: 90,
  l5: 45,
  l10: 45,
  l40: 45,
} as const;

// Larghezze fisse delle colonne per cards-dashboard (standalone)
export const COLUMN_WIDTHS_STANDALONE = {
  name: 200,
  team: 300,
  forma: 90,
  price: 400,
  l5: 50,
  l10: 50,
  l40: 50,
} as const;

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

function formatPriceValue(valueInCents: number | null | undefined): string {
  if (valueInCents === null || valueInCents === undefined) {
    return "-";
  }
  return `€${(valueInCents / 100).toFixed(2)}`;
}

function convertWeiToEur(weiString: string | null | undefined): number | null {
  if (!weiString) {
    return null;
  }
  // Wei è 10^18, quindi per ottenere ETH: wei / 10^18
  // Poi moltiplichiamo per il tasso di cambio EUR e per 100 per avere centesimi
  const weiValue = Number.parseFloat(weiString);
  if (Number.isNaN(weiValue) || weiValue === 0) {
    return null;
  }
  const ethValue = weiValue / 1e18;
  const eurCents = Math.round(ethValue * ETH_TO_EUR_RATE * 100);
  return eurCents;
}

function getPriceDisplay(card: CardData): string {
  const parts: string[] = [];

  // 1. Prezzo di mercato (priceRange.min in Wei -> EUR)
  const marketPriceCents = convertWeiToEur(card.priceRange?.min);
  parts.push(formatPriceValue(marketPriceCents));

  // 2. Prezzo di acquisto (ownershipHistory)
  const purchaseTypes = [
    "INSTANT_BUY",
    "ENGLISH_AUCTION",
    "SINGLE_BUY_OFFER",
    "SINGLE_SALE_OFFER",
    "DIRECT_OFFER",
  ];
  let purchasePrice: number | null | undefined = null;
  if (card.ownershipHistory && card.ownershipHistory.length > 0) {
    for (let i = card.ownershipHistory.length - 1; i >= 0; i--) {
      const entry = card.ownershipHistory[i];
      if (
        entry &&
        purchaseTypes.includes(entry.transferType) &&
        entry.amounts?.eurCents
      ) {
        purchasePrice = entry.amounts.eurCents;
        break;
      }
    }
  }
  parts.push(formatPriceValue(purchasePrice));

  return parts.join(" | ");
}

function getScoreColor(score: number): string {
  if (score === 0) {
    return "#9ca3af"; // grigio
  }
  if (score <= 30) {
    return "#ef4444"; // rosso
  }
  if (score <= 40) {
    return "#f97316"; // arancione
  }
  if (score <= 59) {
    return "#84cc16"; // verde chiaro (lime)
  }
  if (score <= 79) {
    return "#22c55e"; // verde scuro
  }
  return "#22d3ee"; // azzurro chiaro (cyan)
}

function ScoreHistogram({ scores }: { scores: Array<{ score: number }> }) {
  // Prende ultimi 10 punteggi, riempie con 0 se meno di 10
  const lastScores = [...scores].slice(-10);
  const displayScores: Array<{ score: number; position: number }> = [];

  // Riempie con 0 all'inizio se necessario
  const missingCount = 10 - lastScores.length;
  for (let i = 0; i < missingCount; i++) {
    displayScores.push({ score: 0, position: i });
  }

  // Aggiunge i punteggi reali con la loro posizione nella sequenza
  lastScores.forEach((s, idx) => {
    displayScores.push({ score: s.score, position: missingCount + idx });
  });

  const maxScore = 100; // Punteggio massimo

  // Inverte l'ordine per mostrare i punteggi più recenti a destra
  const reversedScores = [...displayScores].reverse();

  return (
    <div className="flex h-[45px] w-[80px] items-end rounded bg-gray-100 p-1">
      {reversedScores.map((item) => {
        const heightPercent = (item.score / maxScore) * 100;
        // Per punteggio 0: altezza fissa di 3px, altrimenti altezza proporzionale con minimo 4%
        const height =
          item.score === 0 ? "3px" : `${Math.max(heightPercent, 4)}%`;
        return (
          <div
            key={`bar-${item.position}`}
            style={{
              width: "7px",
              height,
              backgroundColor: getScoreColor(item.score),
            }}
          />
        );
      })}
    </div>
  );
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
        case "l5":
          return compareValues(
            a.l5Average ?? 0,
            b.l5Average ?? 0,
            sortDirection
          );
        case "l10":
          return compareValues(
            a.l10Average ?? 0,
            b.l10Average ?? 0,
            sortDirection
          );
        case "l40":
          return compareValues(
            a.l40Average ?? 0,
            b.l40Average ?? 0,
            sortDirection
          );
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
    <div className="overflow-x-auto rounded-md border">
      <Table className="table-fixed">
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
              {widths.price && (
                <th
                  className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground"
                  style={{ width: widths.price }}
                />
              )}
              <th
                className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground"
                style={{ width: widths.forma }}
              >
                <div className="flex items-center">Forma</div>
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
                onClick={() => handleSort("l10")}
                style={{ width: widths.l10 }}
              >
                <div className="flex items-center">
                  L10
                  {renderSortIcon("l10")}
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
                    <div className="font-oswald-medium text-[14px] uppercase">
                      {getPlayerName(card)}
                    </div>
                    {card.anyPositions && card.anyPositions.length > 0 && (
                      <div className="text-muted-foreground text-xs">
                        {card.anyPositions
                          .map((pos) => getPositionLabel(pos))
                          .join(", ")}
                        {" • XP "}
                        {getXP(card) || "-"}%
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="truncate" style={{ width: widths.team }}>
                <div className="flex flex-col">
                  <div>{getTeamName(card)}</div>
                  <div className="text-muted-foreground text-xs">
                    {getLeagueName(card)}
                  </div>
                </div>
              </TableCell>
              {widths.match && (
                <TableCell style={{ width: widths.match }}>
                  <NextMatchBlock card={card} />
                </TableCell>
              )}
              {widths.price && (
                <TableCell style={{ width: widths.price }}>
                  <div className="text-xs">{getPriceDisplay(card)}</div>
                </TableCell>
              )}
              <TableCell style={{ width: widths.forma }}>
                <ScoreHistogram scores={card.so5Scores ?? []} />
              </TableCell>
              <TableCell style={{ width: widths.l5 }}>
                <div className="font-medium">
                  {card.l5Average?.toFixed(0) ?? "-"}
                </div>
              </TableCell>
              <TableCell style={{ width: widths.l10 }}>
                <div className="font-medium">
                  {card.l10Average?.toFixed(0) ?? "-"}
                </div>
              </TableCell>
              <TableCell style={{ width: widths.l40 }}>
                <div className="font-medium">
                  {card.l40Average?.toFixed(0) ?? "-"}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
