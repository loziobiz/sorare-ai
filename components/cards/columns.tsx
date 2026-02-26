"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Bookmark } from "lucide-react";
import { getPositionLabel } from "@/lib/cards-utils";
import { ETH_TO_EUR_RATE } from "@/lib/config";
import type { CardData } from "@/lib/sorare-api";
import { CardThumbnail } from "./card-thumbnail";
import { NextMatchBlock } from "./next-match-block";

// Regex per estrarre solo il nome del giocatore (rimuove anno e info carta)
const PLAYER_NAME_REGEX = /^(.+?)\s+\d{4}-\d{2}/;

export function getPlayerName(card: CardData): string {
  const name = card.name;
  const match = name.match(PLAYER_NAME_REGEX);
  return match ? match[1] : name;
}

export function getTeamName(card: CardData): string {
  return card.anyPlayer?.activeClub?.name ?? "-";
}

export function getLeagueName(card: CardData): string {
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

export function getXP(card: CardData): number {
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
  const weiValue = Number.parseFloat(weiString);
  if (Number.isNaN(weiValue) || weiValue === 0) {
    return null;
  }
  const ethValue = weiValue / 1e18;
  const eurCents = Math.round(ethValue * ETH_TO_EUR_RATE * 100);
  return eurCents;
}

export function getPriceDisplay(card: CardData): string {
  const parts: string[] = [];

  const marketPriceCents = convertWeiToEur(card.priceRange?.min);
  parts.push(formatPriceValue(marketPriceCents));

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

export function getScoreColor(score: number): string {
  if (score === 0) {
    return "#9ca3af";
  }
  if (score <= 30) {
    return "#ef4444";
  }
  if (score <= 40) {
    return "#f97316";
  }
  if (score <= 59) {
    return "#84cc16";
  }
  if (score <= 79) {
    return "#22c55e";
  }
  return "#22d3ee";
}

export function ScoreHistogram({
  scores,
}: {
  scores: Array<{ score: number }>;
}) {
  const lastScores = [...scores].slice(-10);
  const displayScores: Array<{ score: number; position: number }> = [];

  const missingCount = 10 - lastScores.length;
  for (let i = 0; i < missingCount; i++) {
    displayScores.push({ score: 0, position: i });
  }

  lastScores.forEach((s, idx) => {
    displayScores.push({ score: s.score, position: missingCount + idx });
  });

  const maxScore = 100;
  const reversedScores = [...displayScores].reverse();

  return (
    <div className="flex h-[45px] w-[80px] items-end rounded bg-gray-100 p-1">
      {reversedScores.map((item) => {
        const heightPercent = (item.score / maxScore) * 100;
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

export interface LineupColumnOptions {
  markedCards?: Map<string, string>;
}

// Larghezze colonne per lineup-builder
export const LINEUP_COLUMN_WIDTHS = {
  name: 310,
  team: 240,
  match: 80,
  spacer: 30,
  forma: 110,
  l5: 50,
  l10: 50,
  l40: 50,
} as const;

// Larghezze colonne per cards-dashboard
export const DASHBOARD_COLUMN_WIDTHS = {
  name: 200,
  team: 300,
  forma: 90,
  price: 400,
  l5: 50,
  l10: 50,
  l40: 50,
} as const;

export function getLineupColumns(
  options: LineupColumnOptions = {}
): ColumnDef<CardData>[] {
  const { markedCards } = options;

  return [
    {
      accessorKey: "name",
      header: "Giocatore",
      size: LINEUP_COLUMN_WIDTHS.name,
      cell: ({ row }) => {
        const card = row.original;
        return (
          <div className="flex items-center gap-3">
            {card.pictureUrl && (
              <CardThumbnail alt={card.name} size={48} src={card.pictureUrl} />
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="font-oswald-medium text-[14px] uppercase">
                  {getPlayerName(card)}
                </div>
                {card.inSeasonEligible && (
                  <span className="inline-flex items-center rounded bg-emerald-100 px-1 py-0.5 font-medium text-[9px] text-emerald-700">
                    IN-SEASON
                  </span>
                )}
                {markedCards?.has(card.slug) && (
                  <span
                    className="inline-flex max-w-[100px] items-center gap-0.5 truncate rounded bg-amber-100 px-1.5 py-0.5 font-medium text-[10px] text-amber-700"
                    title={markedCards.get(card.slug)}
                  >
                    <Bookmark className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {markedCards.get(card.slug)}
                    </span>
                  </span>
                )}
              </div>
              {card.anyPositions && card.anyPositions.length > 0 && (
                <div className="text-muted-foreground text-xs">
                  {card.anyPositions
                    .map((pos) => getPositionLabel(pos))
                    .join(", ")}
                  {" • XP "}
                  {getXP(card) || "-"}%
                  {card.anyPlayer?.nextClassicFixturePlayingStatusOdds && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-slate-600">
                      <span className="text-[10px]">👕</span>
                      {Math.round(
                        card.anyPlayer.nextClassicFixturePlayingStatusOdds
                          .starterOddsBasisPoints / 100
                      )}
                      %
                    </span>
                  )}
                  {(() => {
                    const clubName = card.anyPlayer?.activeClub?.name;
                    const nextGame = card.anyPlayer?.nextGame;
                    if (!clubName || !nextGame) return null;
                    
                    const isHomeTeam = nextGame.homeTeam?.name === clubName;
                    const isAwayTeam = nextGame.awayTeam?.name === clubName;
                    
                    let winOdds: number | null | undefined;
                    if (isHomeTeam) {
                      winOdds = nextGame.homeStats?.winOddsBasisPoints;
                    } else if (isAwayTeam) {
                      winOdds = nextGame.awayStats?.winOddsBasisPoints;
                    }
                    
                    if (!winOdds) return null;
                    
                    return (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-slate-600">
                        <span className="text-[10px]">🏆</span>
                        {Math.round(winOdds / 100)}%
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "team",
      header: "Squadra",
      size: LINEUP_COLUMN_WIDTHS.team,
      cell: ({ row }) => {
        const card = row.original;
        return (
          <div className="flex flex-col">
            <div>{getTeamName(card)}</div>
            <div className="text-muted-foreground text-xs">
              {getLeagueName(card)}
            </div>
          </div>
        );
      },
    },
    {
      id: "match",
      header: "Prossima",
      size: LINEUP_COLUMN_WIDTHS.match,
      cell: ({ row }) => <NextMatchBlock card={row.original} />,
    },
    {
      id: "spacer",
      header: "",
      size: LINEUP_COLUMN_WIDTHS.spacer,
      cell: () => null,
    },
    {
      id: "forma",
      header: "Forma",
      size: LINEUP_COLUMN_WIDTHS.forma,
      cell: ({ row }) => (
        <ScoreHistogram scores={row.original.so5Scores ?? []} />
      ),
    },
    {
      accessorKey: "l5Average",
      header: "L5",
      size: LINEUP_COLUMN_WIDTHS.l5,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.l5Average?.toFixed(0) ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "l10Average",
      header: "L10",
      size: LINEUP_COLUMN_WIDTHS.l10,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.l10Average?.toFixed(0) ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "l40Average",
      header: "L40",
      size: LINEUP_COLUMN_WIDTHS.l40,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.l40Average?.toFixed(0) ?? "-"}
        </div>
      ),
    },
  ];
}

export function getDashboardColumns(): ColumnDef<CardData>[] {
  return [
    {
      accessorKey: "name",
      header: "Giocatore",
      size: DASHBOARD_COLUMN_WIDTHS.name,
      cell: ({ row }) => {
        const card = row.original;
        return (
          <div className="flex items-center gap-3">
            {card.pictureUrl && (
              <CardThumbnail alt={card.name} size={48} src={card.pictureUrl} />
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
        );
      },
    },
    {
      accessorKey: "team",
      header: "Squadra",
      size: DASHBOARD_COLUMN_WIDTHS.team,
      cell: ({ row }) => {
        const card = row.original;
        return (
          <div className="flex flex-col">
            <div>{getTeamName(card)}</div>
            <div className="text-muted-foreground text-xs">
              {getLeagueName(card)}
            </div>
          </div>
        );
      },
    },
    {
      id: "forma",
      header: "Forma",
      size: DASHBOARD_COLUMN_WIDTHS.forma,
      cell: ({ row }) => (
        <ScoreHistogram scores={row.original.so5Scores ?? []} />
      ),
    },
    {
      id: "price",
      header: "Prezzo",
      size: DASHBOARD_COLUMN_WIDTHS.price,
      cell: ({ row }) => (
        <div className="text-xs">{getPriceDisplay(row.original)}</div>
      ),
    },
    {
      accessorKey: "l5Average",
      header: "L5",
      size: DASHBOARD_COLUMN_WIDTHS.l5,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.l5Average?.toFixed(0) ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "l10Average",
      header: "L10",
      size: DASHBOARD_COLUMN_WIDTHS.l10,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.l10Average?.toFixed(0) ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "l40Average",
      header: "L40",
      size: DASHBOARD_COLUMN_WIDTHS.l40,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.l40Average?.toFixed(0) ?? "-"}
        </div>
      ),
    },
  ];
}
