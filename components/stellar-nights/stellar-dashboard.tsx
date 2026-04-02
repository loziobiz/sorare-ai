"use client";

import { Download, Loader2, Star, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useStellarCards } from "@/hooks/use-stellar-cards";
import { StellarLineupBuilder } from "./stellar-lineup-builder";

function formatDate(date: Date): string {
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function StellarDashboard() {
  const {
    cards,
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
          <Button
            className="border border-white/10"
            onClick={download}
            size="sm"
            variant="ghost"
          >
            <Download />
            Aggiorna
          </Button>
          <Button onClick={clearCache} size="sm" variant="ghost">
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Lineup Builder */}
      <StellarLineupBuilder cards={cards} />
    </div>
  );
}
