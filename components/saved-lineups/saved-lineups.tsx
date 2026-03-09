"use client";

import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, Pencil, Trash, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";

import { Button } from "@/components/ui/button";
import { useKvCards } from "@/hooks/use-kv-cards";
import { calculateCardsL10Total } from "@/lib/cards-utils";
import type { SavedFormation } from "@/lib/db";
import { db } from "@/lib/db";
import type { UnifiedCard } from "@/lib/kv-types";
import type { CardData } from "@/lib/sorare-api";

type Card = CardData | UnifiedCard;

import { SavedLineupsDnDProvider, useSavedLineupsDnD } from "./dnd-context";
import { DraggableCard, PlaceholderSlot } from "./draggable-card";

interface CompactCardProps {
  card: {
    slug: string;
    name: string;
    pictureUrl?: string;
    l5Average?: number;
    l10Average?: number;
    power?: string;
    anyPlayer?: {
      activeClub?: { name: string; code?: string } | null;
      nextGame?: {
        date?: string | null;
        homeTeam?: { name?: string; code?: string } | null;
        awayTeam?: { name?: string; code?: string } | null;
      } | null;
      nextClassicFixturePlayingStatusOdds?: {
        starterOddsBasisPoints: number;
        substituteOddsBasisPoints?: number;
        nonPlayingOddsBasisPoints?: number;
        reliability?: string;
        providerIconUrl?: string;
      } | null;
    };
  };
}

// Label delle modalità di gioco (condiviso tra i componenti)
const GAME_MODE_LABELS: Record<string, string> = {
  uncapped: "Uncapped",
  260: "CAP 260",
  220: "CAP 220",
  pro_gas: "Pro GAS",
  mls_arena_260: "MLS ARENA 260",
  mls_in_season: "MLS IN-SEASON",
  gas_arena_260: "GAS ARENA 260",
  gas_arena_220: "GAS ARENA 220",
  gas_arena_nocap: "GAS ARENA NOCAP",
  gas_classic: "GAS CLASSIC",
};

/**
 * Restituisce il colore del badge L10 in base al valore
 */
function getL10BadgeColor(l10: number | undefined): {
  bg: string;
  text: string;
} {
  if (!l10 || l10 === 0) {
    return { bg: "bg-white/10", text: "text-slate-400" };
  }
  if (l10 <= 30) {
    return { bg: "bg-red-500/20", text: "text-red-400" };
  }
  if (l10 <= 40) {
    return { bg: "bg-orange-500/20", text: "text-orange-400" };
  }
  if (l10 <= 59) {
    return { bg: "bg-lime-500/20", text: "text-lime-400" };
  }
  if (l10 <= 79) {
    return { bg: "bg-emerald-500/20", text: "text-emerald-400" };
  }
  return { bg: "bg-cyan-500/20", text: "text-cyan-400" };
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

  const isHomeTeam =
    playerClubName && homeTeamName && playerClubName === homeTeamName;
  const isAwayTeam =
    playerClubName && awayTeamName && playerClubName === awayTeamName;

  return (
    <div className="flex flex-col items-center leading-tight">
      <div className="flex items-center gap-1 font-medium text-[11px] text-slate-300">
        <span className={isHomeTeam ? "rounded bg-white/10 px-1" : ""}>
          {homeTeam}
        </span>
        <span className="text-slate-500">vs</span>
        <span className={isAwayTeam ? "rounded bg-white/10 px-1" : ""}>
          {awayTeam}
        </span>
      </div>
      <div className="text-[10px] text-slate-500">
        {formatted.day} · {formatted.time}
      </div>
    </div>
  );
}

function CompactCard({
  card,
  formationId,
  slotPosition,
  isDragging,
}: CompactCardProps & {
  formationId: number;
  slotPosition: string;
  isDragging?: boolean;
}) {
  if (isDragging) {
    return <PlaceholderSlot slotPosition={slotPosition} />;
  }

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
      </div>
      {/* Banda con L10 e % Titolarità */}
      <div className="flex w-full items-center justify-center gap-2">
        {/* L10 */}
        {(() => {
          const colors = getL10BadgeColor(card.l10Average);
          return (
            <span
              className={`inline-flex w-10 items-center justify-center gap-0.5 rounded px-1 py-0.5 font-medium text-[9px] ${colors.bg} ${colors.text}`}
            >
              <span>📊</span>
              {card.l10Average ?? "-"}
            </span>
          );
        })()}
        {/* % Titolarità */}
        {card.anyPlayer?.nextClassicFixturePlayingStatusOdds &&
          (() => {
            const starterOdds = Math.round(
              card.anyPlayer.nextClassicFixturePlayingStatusOdds
                .starterOddsBasisPoints / 100
            );
            let colorClass = "";
            if (starterOdds < 50) {
              colorClass = "bg-red-500/20 text-red-400";
            } else if (starterOdds <= 70) {
              colorClass = "bg-orange-500/20 text-orange-400";
            } else {
              colorClass = "bg-emerald-500/20 text-emerald-400";
            }
            return (
              <span
                className={`inline-flex w-10 items-center justify-center gap-0.5 rounded px-1 py-0.5 font-medium text-[9px] ${colorClass}`}
              >
                <span>👕</span>
                {starterOdds}
              </span>
            );
          })()}
      </div>
      {/* Info partita */}
      <MatchInfo
        nextGame={card.anyPlayer?.nextGame}
        playerClubName={card.anyPlayer?.activeClub?.name}
      />
    </div>
  );
}

interface FormationCardProps {
  formation: SavedFormation;
  allFormations: SavedFormation[];
  onEdit: (formation: SavedFormation) => void;
  onDelete: (id: number) => void;
  currentCardsMap: Map<string, Card>;
}

function FormationCard({
  formation,
  allFormations,
  onEdit,
  onDelete,
  currentCardsMap,
}: FormationCardProps) {
  const { dragState, updateCompatibility } = useSavedLineupsDnD();

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
      const freshCard = currentCardsMap.get(card.slug);
      const cardAnyPlayer = card.anyPlayer;
      const freshAnyPlayer = freshCard?.anyPlayer;

      // Deep merge di anyPlayer per preservare dati come nextClassicFixturePlayingStatusOdds
      const mergedAnyPlayer = {
        ...cardAnyPlayer,
        ...freshAnyPlayer,
        // Preserva nextClassicFixturePlayingStatusOdds se i dati freschi non lo hanno
        nextClassicFixturePlayingStatusOdds:
          freshAnyPlayer?.nextClassicFixturePlayingStatusOdds ??
          cardAnyPlayer?.nextClassicFixturePlayingStatusOdds,
      };

      if (freshCard) {
        // Usa sempre i dati freschi dal KV per gli average
        return {
          ...card,
          power: freshCard.power ?? card.power,
          l5Average: freshCard.l5Average,
          l10Average: freshCard.l10Average,
          l15Average: freshCard.l15Average,
          l40Average: freshCard.l40Average,
          anyPlayer: mergedAnyPlayer,
        };
      }

      // Nessun fallback storico per le statistiche
      return {
        ...card,
        l5Average: undefined,
        l10Average: undefined,
        l15Average: undefined,
        l40Average: undefined,
        anyPlayer: mergedAnyPlayer,
      };
    })
    .map((card) => card as Card);

  // Aggiorna compatibilità quando inizia il drag
  useEffect(() => {
    if (dragState.activeItem) {
      updateCompatibility(allFormations);
    }
  }, [dragState.activeItem, allFormations, updateCompatibility]);

  // Label della modalità
  const modeLabel = GAME_MODE_LABELS[formation.gameMode] ?? "CAP 260";

  // Determina il colore del badge in base al gameMode
  let modeColor: string;
  if (
    formation.gameMode === "pro_gas" ||
    formation.gameMode === "gas_classic"
  ) {
    modeColor = "bg-purple-500/20 text-purple-400";
  } else if (
    formation.gameMode === "mls_arena_260" ||
    formation.gameMode === "mls_in_season"
  ) {
    modeColor = "bg-white/10 text-slate-300";
  } else {
    modeColor = "bg-white/5 text-slate-400";
  }

  // Calcolo L10 totale e rapporto CAP
  const totalL10 = calculateCardsL10Total(sortedCards);
  // Estrai CAP dal gameMode (gestisce sia numeri che stringhe come "mls_arena_260")
  const gameModeStr = String(formation.gameMode ?? "");
  let capValue: number | null = null;
  if (gameModeStr.includes("260")) {
    capValue = 260;
  } else if (gameModeStr.includes("220")) {
    capValue = 220;
  }
  const capRatio = capValue ? totalL10 / capValue : null;

  const isCardDragging = (card: Card) =>
    dragState.activeItem?.card.slug === card.slug;

  return (
    <div className="min-w-0 max-w-full space-y-2 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 shadow-sm">
      {/* Nome formazione, L10/CAP e azioni */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h3 className="font-bold text-lg text-slate-200 leading-tight">
            {formation.name}
          </h3>
          <span
            className={`inline-block w-fit rounded px-1 py-[1px] font-medium text-[10px] ${modeColor}`}
          >
            {modeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* L10/CAP a sinistra dei pulsanti azione */}
          {capRatio !== null && (
            <span
              className={`inline-block rounded-full px-2 py-0.5 font-medium text-[12px] ${capRatio > 1 ? "bg-orange-500/20 text-orange-400" : "bg-emerald-500/20 text-emerald-400"}`}
            >
              {totalL10.toFixed(0)}/{capValue}
            </span>
          )}
          {/* Pulsanti azione - solo icone */}
          <div className="flex items-center gap-1">
            <Button
              className="h-8 w-8 p-0 hover:bg-white/10"
              onClick={() => onEdit(formation)}
              size="icon"
              variant="ghost"
            >
              <Pencil className="h-4 w-4 text-slate-400 transition-colors hover:text-white" />
            </Button>
            <Button
              className="h-8 w-8 p-0 hover:bg-white/10 hover:text-red-400"
              onClick={() => formation.id && onDelete(formation.id)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Carte in orizzontale */}
      <div
        className="no-scrollbar flex gap-1 overflow-x-auto pb-0"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {sortedCards.map((card) => {
          const slot = formation.slots.find((s) => s.cardSlug === card.slug);
          const slotPosition = slot?.position ?? "";
          const isDragging = isCardDragging(card);

          return (
            <DraggableCard
              card={card}
              formationId={formation.id ?? 0}
              key={card.slug}
              slotPosition={slotPosition}
            >
              <CompactCard
                card={card}
                formationId={formation.id ?? 0}
                isDragging={isDragging}
                slotPosition={slotPosition}
              />
            </DraggableCard>
          );
        })}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export function SavedLineups() {
  const router = useRouter();
  const { cards } = useKvCards();
  const [isLoading, setIsLoading] = useState(true);
  const [formations, setFormations] = useState<SavedFormation[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  // Create a map of current cards for quick lookup
  const currentCardsMap = useMemo(
    () => new Map(cards.map((card): [string, Card] => [card.slug, card])),
    [cards]
  );

  const loadFormations = useCallback(async () => {
    try {
      const all = await db.savedFormations.toArray();
      // Sort by league, then by createdAt (oldest first)
      const sorted = all.sort((a, b) => {
        if (a.league !== b.league) {
          return a.league.localeCompare(b.league);
        }
        return a.createdAt - b.createdAt;
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

  const handleConfirmDeleteAll = async () => {
    try {
      await db.savedFormations.clear();
      setFormations([]);
      setDeleteAllConfirm(false);
    } catch (err) {
      console.error("Error deleting all formations:", err);
    }
  };

  const handleSwapCards = useCallback(
    async (
      source: { formationId: number; card: Card; slotPosition: string },
      target: { formationId: number; card: Card; slotPosition: string }
    ) => {
      try {
        // Trova le formazioni coinvolte
        const sourceFormation = formations.find(
          (f) => f.id === source.formationId
        );
        const targetFormation = formations.find(
          (f) => f.id === target.formationId
        );

        if (!(sourceFormation && targetFormation)) return;

        // Crea copie delle formazioni con le carte scambiate
        const updatedSourceCards = sourceFormation.cards.map((c) =>
          c.slug === source.card.slug ? target.card : c
        );
        const updatedTargetCards = targetFormation.cards.map((c) =>
          c.slug === target.card.slug ? source.card : c
        );

        // Crea copie degli slot con le posizioni scambiate
        const updatedSourceSlots = sourceFormation.slots?.map((s) => {
          if (s.cardSlug === source.card.slug) {
            return { ...s, cardSlug: target.card.slug };
          }
          return s;
        });
        const updatedTargetSlots = targetFormation.slots?.map((s) => {
          if (s.cardSlug === target.card.slug) {
            return { ...s, cardSlug: source.card.slug };
          }
          return s;
        });

        // Aggiorna nel database
        await Promise.all([
          db.savedFormations.update(source.formationId, {
            cards: updatedSourceCards,
            slots: updatedSourceSlots,
          }),
          db.savedFormations.update(target.formationId, {
            cards: updatedTargetCards,
            slots: updatedTargetSlots,
          }),
        ]);

        // Aggiorna stato locale
        setFormations((prev) =>
          prev.map((f) => {
            if (f.id === source.formationId) {
              return {
                ...f,
                cards: updatedSourceCards,
                slots: updatedSourceSlots,
              };
            }
            if (f.id === target.formationId) {
              return {
                ...f,
                cards: updatedTargetCards,
                slots: updatedTargetSlots,
              };
            }
            return f;
          })
        );
      } catch (err) {
        console.error("Error swapping cards:", err);
      }
    },
    [formations]
  );

  /**
   * Calcola la data della prima partita di una formazione
   * (la data più vicina tra tutte le carte della formazione)
   */
  const getFormationNextGameDate = useCallback(
    (formation: SavedFormation): Date | null => {
      let earliestDate: Date | null = null;

      for (const card of formation.cards) {
        const cardData = currentCardsMap.get(card.slug);
        const nextGameDate = cardData?.anyPlayer?.nextGame?.date;
        if (nextGameDate) {
          const date = new Date(nextGameDate);
          if (!earliestDate || date < earliestDate) {
            earliestDate = date;
          }
        }
      }

      return earliestDate;
    },
    [currentCardsMap]
  );

  // Raggruppa le formazioni per gameMode e ordina per data della prima partita
  const groupedFormations = useMemo(() => {
    const groups: Record<string, SavedFormation[]> = {};

    for (const formation of formations) {
      const gameModeLabel =
        GAME_MODE_LABELS[formation.gameMode] ?? formation.gameMode ?? "Altro";

      if (!groups[gameModeLabel]) {
        groups[gameModeLabel] = [];
      }
      groups[gameModeLabel].push(formation);
    }

    // Ordina ogni gruppo per data della prima partita
    for (const label of Object.keys(groups)) {
      groups[label].sort((a, b) => {
        const dateA = getFormationNextGameDate(a);
        const dateB = getFormationNextGameDate(b);

        // Se entrambe hanno una data, confronta le date
        if (dateA && dateB) {
          return dateA.getTime() - dateB.getTime();
        }
        // Se solo una ha una data, mettila prima
        if (dateA) return -1;
        if (dateB) return 1;
        // Se nessuna ha una data, mantieni l'ordine originale
        return 0;
      });
    }

    return groups;
  }, [formations, getFormationNextGameDate]);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoadingSpinner icon="loader" message="Caricamento formazioni..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con pulsante Cancella tutte */}
      {formations.length > 0 && (
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl text-slate-200">
            Formazioni salvate
          </h1>
          <Button
            className="border-white/10 bg-white/5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
            onClick={() => setDeleteAllConfirm(true)}
            variant="outline"
          >
            <Trash className="mr-2 h-4 w-4" />
            Cancella tutte
          </Button>
        </div>
      )}

      <SavedLineupsDnDProvider onSwap={handleSwapCards}>
        {formations.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
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
            {Object.entries(groupedFormations)
              .filter(([, items]) => items.length > 0)
              .map(([gameModeLabel, items]) => (
                <div key={gameModeLabel}>
                  <h2 className="mb-3 font-bold text-lg text-slate-200">
                    {gameModeLabel}
                  </h2>
                  <div className="flex flex-wrap items-start gap-5">
                    {items.map((formation) => (
                      <FormationCard
                        allFormations={formations}
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
      </SavedLineupsDnDProvider>

      {/* Modale conferma cancellazione singola */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#1A1B23] shadow-2xl">
            {/* Header con icona */}
            <div className="flex flex-col items-center border-white/10 border-b bg-white/5 px-6 pt-6 pb-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-lg text-slate-200">
                Conferma cancellazione
              </h3>
            </div>

            {/* Contenuto */}
            <div className="px-6 py-4">
              <p className="text-center text-slate-400 text-sm leading-relaxed">
                Sei sicuro di voler cancellare questa formazione?
                <br />
                <span className="text-slate-500">
                  Questa azione non può essere annullata.
                </span>
              </p>
            </div>

            {/* Azioni */}
            <div className="flex gap-3 border-white/10 border-t bg-white/5 px-6 py-4">
              <Button
                className="h-10 flex-1 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
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

      {/* Modale conferma cancellazione tutte */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1A1B23] shadow-2xl">
            {/* Header con icona */}
            <div className="flex flex-col items-center border-white/10 border-b bg-red-500/10 px-6 pt-6 pb-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-lg text-red-400">
                Attenzione: azione irreversibile
              </h3>
            </div>

            {/* Contenuto */}
            <div className="px-6 py-5">
              <p className="text-center text-slate-300 text-sm leading-relaxed">
                Stai per cancellare <strong>{formations.length}</strong>{" "}
                formazioni salvate.
              </p>
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-center font-medium text-red-400 text-sm">
                  Questa operazione è definitiva e non può essere annullata.
                </p>
              </div>
              <p className="mt-4 text-center text-slate-500 text-xs">
                Tutte le tue formazioni andranno perse permanentemente.
              </p>
            </div>

            {/* Azioni */}
            <div className="flex gap-3 border-white/10 border-t bg-white/5 px-6 py-4">
              <Button
                className="h-10 flex-1 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => setDeleteAllConfirm(false)}
                variant="outline"
              >
                Annulla
              </Button>
              <Button
                className="h-10 flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleConfirmDeleteAll}
                variant="destructive"
              >
                Sì, cancella tutte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
