"use client";

import { Calendar, Download, Loader2, Star, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStellarCards } from "@/hooks/use-stellar-cards";
import type { StellarFlatCard } from "@/lib/stellar/types";

function formatDate(date: Date): string {
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGameDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StellarCardItem({ card }: { card: StellarFlatCard }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#1E1F2A] transition-colors hover:border-violet-500/30">
      {card.pictureUrl ? (
        <img
          alt={card.name}
          className="aspect-[3/4] w-full object-cover"
          height={400}
          loading="lazy"
          src={card.pictureUrl}
          width={300}
        />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center bg-white/5">
          <Star className="h-8 w-8 text-slate-600" />
        </div>
      )}
      <div className="space-y-1.5 p-2">
        <p className="truncate font-medium text-sm text-white">
          {card.playerName}
        </p>
        <div className="flex items-center gap-1.5">
          {card.clubPictureUrl && (
            <img
              alt={card.clubName ?? ""}
              className="h-4 w-4 rounded-full"
              height={16}
              src={card.clubPictureUrl}
              width={16}
            />
          )}
          <p className="truncate text-slate-400 text-xs">
            {card.clubName ?? "N/A"}
          </p>
        </div>

        {/* L10 & Projected */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            L10:{" "}
            <span className="text-white">
              {card.l10Average == null ? "-" : card.l10Average.toFixed(1)}
            </span>
          </span>
          <span className="text-slate-400">
            Proj:{" "}
            <span className="text-emerald-400">
              {card.projectedScore == null
                ? "-"
                : card.projectedScore.toFixed(1)}
            </span>
          </span>
        </div>

        {/* Next game */}
        {card.nextGameDate && (
          <div className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-1 text-xs">
            <Calendar className="h-3 w-3 shrink-0 text-slate-500" />
            <span className="truncate text-slate-300">
              {formatGameDate(card.nextGameDate)}{" "}
              {card.nextGameOpponent && (
                <span className="text-slate-500">{card.nextGameOpponent}</span>
              )}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-300 text-xs">
            {card.positions.join(", ")}
          </span>
          {card.power && (
            <span className="text-slate-500 text-xs">{card.power}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  onDownload,
  isDownloading,
}: {
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-20">
      <div className="rounded-full bg-violet-500/10 p-6">
        <Star className="h-12 w-12 text-violet-400" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="font-semibold text-white text-xl">Stellar Nights</h2>
        <p className="max-w-md text-slate-400 text-sm">
          Scarica le tue carte Stellar Nights da Sorare per visualizzarle qui.
        </p>
      </div>
      <Button disabled={isDownloading} onClick={onDownload} size="lg">
        {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
        {isDownloading ? "Download in corso..." : "Download Carte Stellar"}
      </Button>
    </div>
  );
}

function StatsBar({
  totalCards,
  totalCollections,
  completeCollections,
  cardSetName,
}: {
  totalCards: number;
  totalCollections: number;
  completeCollections: number;
  cardSetName: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-[#1E1F2A] px-4 py-3">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-violet-400" />
        <span className="font-medium text-sm text-white">{cardSetName}</span>
      </div>
      <div className="h-4 w-px bg-white/10" />
      <div className="flex gap-4 text-sm">
        <span className="text-slate-400">
          Carte: <span className="text-white">{totalCards}</span>
        </span>
        <span className="text-slate-400">
          Collezioni:{" "}
          <span className="text-white">
            {completeCollections}/{totalCollections}
          </span>
        </span>
      </div>
    </div>
  );
}

export function StellarDashboard() {
  const {
    cards,
    cardSetName,
    totalCollections,
    completeCollections,
    isLoading,
    isDownloading,
    error,
    progress,
    lastUpdate,
    download,
    clearCache,
  } = useStellarCards();

  if (isLoading) {
    return <LoadingSpinner message="Caricamento cache..." />;
  }

  if (isDownloading) {
    return <LoadingSpinner icon="refresh" message={progress} />;
  }

  if (cards.length === 0 && !error) {
    return (
      <div className="mt-6">
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <EmptyState isDownloading={isDownloading} onDownload={download} />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl text-white">Stellar Nights</h1>
          {lastUpdate && (
            <p className="text-slate-500 text-xs">
              Ultimo aggiornamento: {formatDate(lastUpdate)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={download} size="sm" variant="outline">
            <Download />
            Aggiorna
          </Button>
          <Button onClick={clearCache} size="sm" variant="ghost">
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {cardSetName && (
        <StatsBar
          cardSetName={cardSetName}
          completeCollections={completeCollections}
          totalCards={cards.length}
          totalCollections={totalCollections}
        />
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((card) => (
          <StellarCardItem card={card} key={card.slug} />
        ))}
      </div>
    </div>
  );
}
