"use client";

import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

import { Button } from "@/components/ui/button";
import { useCards } from "@/hooks/use-cards";
import { ACTIVE_LEAGUES } from "@/lib/config";
import type { SavedFormation } from "@/lib/db";
import { db } from "@/lib/db";

interface CompactCardProps {
  card: {
    slug: string;
    name: string;
    pictureUrl?: string;
    l5Average?: number;
    l10Average?: number;
    power?: string;
    anyPlayer?: {
      activeClub?: { name?: string } | null;
      nextGame?: {
        date?: string | null;
        homeTeam?: { name?: string; shortName?: string } | null;
        awayTeam?: { name?: string; shortName?: string } | null;
      } | null;
    };
  };
}

function getTeamAbbreviation(
  name: string | undefined | null,
  code: string | undefined | null
): string {
  if (code) {
    return code;
  }
  if (!name) {
    return "???";
  }
  return name.slice(0, 3).toUpperCase();
}

function formatMatchDate(dateString: string | undefined | null): {
  day: string;
  time: string;
} | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const days = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];
  const day = days[date.getDay()];

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  return { day, time };
}

function MatchInfo({
  nextGame,
  playerClubName,
}: {
  nextGame?: {
    date?: string | null;
    homeTeam?: { name?: string; code?: string } | null;
    awayTeam?: { name?: string; code?: string } | null;
  } | null;
  playerClubName?: string | null;
}) {
  if (!nextGame?.date) {
    return <span className="text-[10px] text-slate-400">-</span>;
  }

  const formatted = formatMatchDate(nextGame.date);
  if (!formatted) {
    return <span className="text-[10px] text-slate-400">-</span>;
  }

  const homeTeamName = nextGame.homeTeam?.name;
  const awayTeamName = nextGame.awayTeam?.name;
  const homeTeamCode = nextGame.homeTeam?.code;
  const awayTeamCode = nextGame.awayTeam?.code;
  const homeTeam = getTeamAbbreviation(homeTeamName, homeTeamCode);
  const awayTeam = getTeamAbbreviation(awayTeamName, awayTeamCode);

  const isHomeTeam = playerClubName && homeTeamName && playerClubName === homeTeamName;
  const isAwayTeam = playerClubName && awayTeamName && playerClubName === awayTeamName;

  return (
    <div className="flex flex-col items-center leading-tight">
      <div className="flex items-center gap-1 font-medium text-[11px] text-slate-700">
        <span className={isHomeTeam ? "rounded bg-slate-200 px-1" : ""}>{homeTeam}</span>
        <span className="text-slate-400">vs</span>
        <span className={isAwayTeam ? "rounded bg-slate-200 px-1" : ""}>{awayTeam}</span>
      </div>
      <div className="text-[10px] text-slate-500">
        {formatted.day} · {formatted.time}
      </div>
    </div>
  );
}

function CompactCard({ card }: CompactCardProps) {
  return (
    <div className="flex w-[85px] flex-col items-center gap-1">
      <div className="relative">
        {card.pictureUrl && (
          <img
            alt={card.name}
            className="h-auto max-w-[85px] rounded-lg"
            height={100}
            loading="lazy"
            src={card.pictureUrl}
            width={85}
          />
        )}
        {/* Badge L10 */}
        <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 font-bold text-[10px] text-emerald-700 shadow-sm">
          {card.l10Average?.toFixed(0) ?? "-"}
        </div>
      </div>
      {/* Info partita */}
      <MatchInfo nextGame={card.anyPlayer?.nextGame} playerClubName={card.anyPlayer?.activeClub?.name} />
    </div>
  );
}

interface FormationCardProps {
  formation: SavedFormation;
  onEdit: (formation: SavedFormation) => void;
  onDelete: (id: number) => void;
  currentCardsMap: Map<string, Record<string, unknown>>;
}

function FormationCard({
  formation,
  onEdit,
  onDelete,
  currentCardsMap,
}: FormationCardProps) {
  // Define position order: POR → DIF → DIF1 → DIF2 → CEN → CEN1 → CEN2 → ATT → ATT1 → ATT2 → EXTRA (EX/EXT)
  const positionOrder: Record<string, number> = {
    POR: 0,
    DIF: 1,
    DIF1: 1,
    DIF2: 2,
    CEN: 3,
    CEN1: 3,
    CEN2: 4,
    ATT: 5,
    ATT1: 5,
    ATT2: 6,
    EX: 7,
    EXT: 7,
    EXTRA: 7,
  };

  // Sort cards based on their position in slots array and merge with fresh data
  const sortedCards = [...formation.cards]
    .sort((a, b) => {
      const slotA = formation.slots.find((s) => s.cardSlug === a.slug);
      const slotB = formation.slots.find((s) => s.cardSlug === b.slug);

      if (!(slotA && slotB)) {
        return 0;
      }

      const orderA = positionOrder[slotA.position] ?? 999;
      const orderB = positionOrder[slotB.position] ?? 999;

      return orderA - orderB;
    })
    .map((card) => {
      // Merge saved card with fresh data to get power, l10Average, activeClub, and nextGame
      const freshData = currentCardsMap.get(card.slug);
      if (freshData) {
        return {
          ...card,
          power: freshData.power as string | undefined,
          l10Average: freshData.l10Average as number | undefined,
          anyPlayer: freshData.anyPlayer as
            | {
                activeClub?: { name?: string } | null;
                nextGame?: {
                  date?: string | null;
                  homeTeam?: { name?: string; code?: string } | null;
                  awayTeam?: { name?: string; code?: string } | null;
                } | null;
              }
            | undefined,
        };
      }
      return card;
    });

  // Label della modalità
  const modeLabels: Record<string, string> = {
    uncapped: "Uncapped",
    260: "CAP 260",
    220: "CAP 220",
    pro_gas: "Pro GAS",
  };
  const modeLabel = modeLabels[formation.gameMode] ?? "CAP 260";
  const modeColor =
    formation.gameMode === "pro_gas"
      ? "bg-purple-100 text-purple-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="w-fit space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {/* Nome formazione, modalità e lega */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-xl">{formation.name}</h3>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 font-medium text-[10px] ${modeColor}`}
          >
            {modeLabel} • {formation.slots.length} giocatori
          </span>
        </div>
      </div>

      {/* Carte in orizzontale */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {sortedCards.map((card) => (
          <CompactCard card={card} key={card.slug} />
        ))}
      </div>

      {/* Pulsanti azione */}
      <div className="flex gap-2">
        <Button
          className="h-8 flex-1 px-2 text-xs"
          onClick={() => onEdit(formation)}
          variant="outline"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Modifica
        </Button>
        <Button
          className="h-8 flex-1 px-2 text-xs"
          onClick={() => formation.id && onDelete(formation.id)}
          variant="destructive"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Cancella
        </Button>
      </div>
    </div>
  );
}

export function SavedLineups() {
  const router = useRouter();
  const { cards } = useCards();
  const [isLoading, setIsLoading] = useState(true);
  const [formations, setFormations] = useState<SavedFormation[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Create a map of current cards for quick lookup
  const currentCardsMap = useMemo(
    () =>
      new Map(
        cards.map((card) => [
          card.slug,
          {
            power: card.power,
            l10Average: card.l10Average,
            anyPlayer: card.anyPlayer,
          } as Record<string, unknown>,
        ])
      ),
    [cards]
  );

  const loadFormations = useCallback(async () => {
    try {
      const all = await db.savedFormations.toArray();
      // Sort by league, then by createdAt (newest first)
      const sorted = all.sort((a, b) => {
        if (a.league !== b.league) {
          return a.league.localeCompare(b.league);
        }
        return b.createdAt - a.createdAt;
      });
      setFormations(sorted);
    } catch (err) {
      console.error("Error loading formations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFormations();
  }, [loadFormations]);

  const handleEdit = (formation: SavedFormation) => {
    // Pass the formation data to the edit page via router state
    router.navigate({ to: "/lineup", search: { edit: formation.id } });
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm === null) {
      return;
    }
    try {
      await db.savedFormations.delete(deleteConfirm);
      setFormations((prev) => prev.filter((f) => f.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting formation:", err);
    }
  };

  const groupedFormations = useMemo(() => {
    const groups: Record<string, SavedFormation[]> = {};
    for (const formation of formations) {
      const [leagueName, countryCode] = formation.league.split("|");
      const customName = ACTIVE_LEAGUES[formation.league];
      const leagueLabel = customName ?? `${leagueName} (${countryCode})`;

      if (!groups[leagueLabel]) {
        groups[leagueLabel] = [];
      }
      groups[leagueLabel].push(formation);
    }
    return groups;
  }, [formations]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoadingSpinner icon="loader" message="Caricamento formazioni..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Formazioni Salvate</h1>
        <p className="text-muted-foreground">
          {formations.length}{" "}
          {formations.length === 1 ? "formazione" : "formazioni"}
        </p>
      </div>

      {formations.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <p>Nessuna formazione salvata.</p>
          <Button
            className="mt-4"
            onClick={() => router.navigate({ to: "/lineup" })}
          >
            Crea una nuova formazione
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFormations).map(([league, items]) => (
            <div key={league}>
              <h2 className="mb-4 font-bold text-slate-700 text-xl">
                {league}
              </h2>
              <div className="grid gap-2 lg:grid-cols-3">
                {items.map((formation) => (
                  <FormationCard
                    currentCardsMap={currentCardsMap}
                    formation={formation}
                    key={formation.id}
                    onDelete={handleDeleteClick}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale conferma cancellazione */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Header con icona */}
            <div className="flex flex-col items-center border-b bg-slate-50 px-6 pt-6 pb-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg text-slate-800">
                Conferma cancellazione
              </h3>
            </div>

            {/* Contenuto */}
            <div className="px-6 py-4">
              <p className="text-center text-slate-600 text-sm leading-relaxed">
                Sei sicuro di voler cancellare questa formazione?
                <br />
                <span className="text-slate-500">
                  Questa azione non può essere annullata.
                </span>
              </p>
            </div>

            {/* Azioni */}
            <div className="flex gap-3 border-t bg-slate-50 px-6 py-4">
              <Button
                className="h-10 flex-1"
                onClick={() => setDeleteConfirm(null)}
                variant="outline"
              >
                Annulla
              </Button>
              <Button
                className="h-10 flex-1"
                onClick={handleConfirmDelete}
                variant="destructive"
              >
                Cancella
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
