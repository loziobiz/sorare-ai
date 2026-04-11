"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, Home, Plane, Star } from "lucide-react";
import type { StellarFlatCard } from "@/lib/stellar/types";
import { ScoreHistogram } from "./score-histogram";

const POSITION_ABBR: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DF",
  Midfielder: "MD",
  Forward: "FW",
};

const SHORT_DAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

function formatGameDay(isoDate: string): string {
  const d = new Date(isoDate);
  const day = SHORT_DAYS[d.getDay()];
  const date = d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${date} ${time}`;
}

function getL10Color(value: number): string {
  if (value === 0) return "bg-white/10 text-slate-400";
  if (value <= 30) return "bg-red-500/20 text-red-400";
  if (value <= 40) return "bg-orange-500/20 text-orange-400";
  if (value <= 59) return "bg-lime-500/20 text-lime-400";
  if (value <= 79) return "bg-emerald-500/20 text-emerald-400";
  return "bg-cyan-500/20 text-cyan-400";
}

function getStarterColor(odds: number): string {
  if (odds >= 70) return "bg-emerald-500/20 text-emerald-400";
  if (odds >= 50) return "bg-amber-500/20 text-amber-400";
  return "bg-red-500/20 text-red-400";
}

export const STELLAR_LIST_COLUMN_WIDTHS = {
  player: 240,
  forma: 60,
  l10: 58,
  proj: 58,
  starter: 68,
  match: 180,
} as const;

export function getStellarColumns(
  onCardClick: (card: StellarFlatCard) => void
): ColumnDef<StellarFlatCard>[] {
  return [
    {
      accessorKey: "playerName",
      header: "Giocatore",
      size: STELLAR_LIST_COLUMN_WIDTHS.player,
      cell: ({ row }) => {
        const card = row.original;
        const posAbbr = card.positions
          .map((p) => POSITION_ABBR[p] ?? p)
          .join("/");
        return (
          <button
            className="flex w-full items-center gap-2 text-left"
            onClick={() => onCardClick(card)}
            type="button"
          >
            {card.pictureUrl ? (
              <img
                alt={card.playerName}
                className="h-10 w-7 shrink-0 rounded object-cover"
                height={40}
                loading="lazy"
                src={card.pictureUrl}
                width={28}
              />
            ) : (
              <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-white/5">
                <Star className="h-3 w-3 text-slate-600" />
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-medium text-white text-xs">
                {card.playerName}
              </p>
              <div className="flex items-center gap-1">
                <span className="rounded bg-violet-500/20 px-1 py-0.5 font-medium text-[10px] text-violet-300">
                  {posAbbr}
                </span>
                <span className="truncate text-[10px] text-slate-400">
                  {card.clubName ?? "-"}
                </span>
              </div>
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "starterOdds",
      header: "Tit%",
      size: STELLAR_LIST_COLUMN_WIDTHS.starter,
      cell: ({ row }) => {
        const val = row.original.starterOdds;
        if (val == null) return <span className="text-slate-500">-</span>;
        return (
          <span
            className={`inline-flex rounded px-1.5 py-0.5 font-medium text-xs ${getStarterColor(val)}`}
          >
            {val.toFixed(0)}%
          </span>
        );
      },
    },
    {
      id: "forma",
      header: "Forma",
      size: STELLAR_LIST_COLUMN_WIDTHS.forma,
      accessorFn: (row) => {
        const scores = row.lastScores;
        if (!scores.length) return 0;
        return scores.reduce((a, b) => a + b, 0) / scores.length;
      },
      cell: ({ row }) => <ScoreHistogram scores={row.original.lastScores} />,
    },
    {
      accessorKey: "l10Average",
      header: "L10",
      size: STELLAR_LIST_COLUMN_WIDTHS.l10,
      cell: ({ row }) => {
        const val = row.original.l10Average;
        if (val == null) return <span className="text-slate-500">-</span>;
        return (
          <span
            className={`inline-flex rounded px-1.5 py-0.5 font-medium text-xs ${getL10Color(val)}`}
          >
            {val.toFixed(0)}
          </span>
        );
      },
    },
    {
      accessorKey: "projectedScore",
      header: "Proj",
      size: STELLAR_LIST_COLUMN_WIDTHS.proj,
      cell: ({ row }) => {
        const val = row.original.projectedScore;
        if (val == null) return <span className="text-slate-500">-</span>;
        return (
          <span className="font-medium text-emerald-400 text-xs">
            {val.toFixed(1)}
          </span>
        );
      },
    },
    {
      id: "nextGame",
      header: "Partita",
      size: STELLAR_LIST_COLUMN_WIDTHS.match,
      accessorFn: (row) => row.nextGameDate ?? "",
      cell: ({ row }) => {
        const card = row.original;
        if (!card.nextGameDate)
          return <span className="text-slate-500">-</span>;
        const isHome = card.nextGameOpponent?.startsWith("vs");
        return (
          <div className="space-y-0.5 text-[11px]">
            <div className="flex items-center gap-1 text-slate-400">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatGameDay(card.nextGameDate)}
            </div>
            {card.nextGameOpponent && (
              <div className="flex items-center gap-1">
                {isHome ? (
                  <Home className="h-3 w-3 shrink-0 text-emerald-500" />
                ) : (
                  <Plane className="h-3 w-3 shrink-0 text-orange-400" />
                )}
                <span className="truncate text-slate-300">
                  {card.nextGameOpponent}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
  ];
}
