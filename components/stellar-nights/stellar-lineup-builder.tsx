"use client";

import { Calendar, Home, Plane, Search, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCache, setCache } from "@/lib/db";
import type { StellarFlatCard } from "@/lib/stellar/types";
import { cn } from "@/lib/utils";
import { ScoreHistogram } from "./score-histogram";
import {
  STELLAR_SLOT_ORDER,
  type StellarFormationSlot,
  StellarPitchField,
  type StellarSlotPosition,
} from "./stellar-pitch-field";
import { useStellarFilteredCards } from "./use-stellar-filtered-cards";

const POSITION_ABBR: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DF",
  Midfielder: "MD",
  Forward: "FW",
};

const SHORT_DAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

function formatDateChip(isoDay: string): string {
  const d = new Date(`${isoDay}T12:00:00`);
  const day = SHORT_DAYS[d.getDay()];
  const dd = d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit" });
  return `${day} ${dd}`;
}

function formatGameDay(isoDate: string): string {
  const d = new Date(isoDate);
  const day = SHORT_DAYS[d.getDay()];
  const date = d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
  });
  const time = d.toLocaleString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${date} ${time}`;
}

const INITIAL_FORMATION: StellarFormationSlot[] = [
  { position: "ATT", card: null },
  { position: "EX", card: null },
  { position: "DIF", card: null },
  { position: "CEN", card: null },
  { position: "POR", card: null },
];

const FORMATION_CACHE_KEY = "stellar_formation";

type SavedSlots = Record<string, string>;

function restoreFormation(
  cards: StellarFlatCard[],
  saved: SavedSlots
): StellarFormationSlot[] {
  const cardsBySlug = new Map(cards.map((c) => [c.slug, c]));
  return INITIAL_FORMATION.map((slot) => {
    const slug = saved[slot.position];
    const card = slug ? (cardsBySlug.get(slug) ?? null) : null;
    return { ...slot, card };
  });
}

function formationToSaved(formation: StellarFormationSlot[]): SavedSlots {
  const saved: SavedSlots = {};
  for (const slot of formation) {
    if (slot.card) {
      saved[slot.position] = slot.card.slug;
    }
  }
  return saved;
}

type SortOption = "name" | "team" | "l10" | "projected";

interface StellarLineupBuilderProps {
  cards: StellarFlatCard[];
}

export function StellarLineupBuilder({ cards }: StellarLineupBuilderProps) {
  const [formation, setFormation] =
    useState<StellarFormationSlot[]>(INITIAL_FORMATION);
  const [activeSlot, setActiveSlot] = useState<StellarSlotPosition | null>(
    "POR"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("l10");
  const [homeOnly, setHomeOnly] = useState(false);
  const [starterOnly, setStarterOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Ripristina formazione da cache al mount
  useEffect(() => {
    if (restoredRef.current || cards.length === 0) {
      return;
    }
    restoredRef.current = true;
    getCache<SavedSlots>(FORMATION_CACHE_KEY).then((saved) => {
      if (saved && Object.keys(saved).length > 0) {
        const restored = restoreFormation(cards, saved);
        setFormation(restored);
        const firstEmpty = STELLAR_SLOT_ORDER.find(
          (pos) => !restored.find((s) => s.position === pos)?.card
        );
        setActiveSlot(firstEmpty ?? null);
      }
    });
  }, [cards]);

  // Salva formazione in cache ad ogni modifica
  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }
    setCache(
      FORMATION_CACHE_KEY,
      formationToSaved(formation),
      7 * 24 * 60 * 60 * 1000
    );
  }, [formation]);

  const usedCardSlugs = useMemo(
    () =>
      new Set(
        formation.filter((s) => s.card).map((s) => s.card?.slug as string)
      ),
    [formation]
  );

  const usedPlayerNames = useMemo(
    () =>
      new Set(
        formation.filter((s) => s.card).map((s) => s.card?.playerName as string)
      ),
    [formation]
  );

  const availableDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 15);
    const days = new Set<string>();
    for (const card of cards) {
      if (card.nextGameDate) {
        const day = card.nextGameDate.slice(0, 10);
        if (
          day >= today.toISOString().slice(0, 10) &&
          day <= maxDate.toISOString().slice(0, 10)
        ) {
          days.add(day);
        }
      }
    }
    return [...days].sort().slice(0, 9);
  }, [cards]);

  const toDateOptions = useMemo(() => {
    if (!dateFrom) {
      return [];
    }
    const fromIdx = availableDates.indexOf(dateFrom);
    if (fromIdx === -1) {
      return [];
    }
    return availableDates.slice(fromIdx, fromIdx + 4);
  }, [dateFrom, availableDates]);

  const filteredCards = useStellarFilteredCards({
    cards,
    usedCardSlugs,
    usedPlayerNames,
    activeSlot,
    searchQuery,
    sortBy,
    homeOnly,
    starterOnly,
    dateFrom,
    dateTo,
  });

  const handleSlotSelect = useCallback((position: StellarSlotPosition) => {
    setActiveSlot((prev) => (prev === position ? null : position));
  }, []);

  const handleCardRemove = useCallback((position: StellarSlotPosition) => {
    setFormation((prev) =>
      prev.map((s) => (s.position === position ? { ...s, card: null } : s))
    );
    setActiveSlot(position);
  }, []);

  const handleCardPlace = useCallback(
    (card: StellarFlatCard) => {
      if (!activeSlot) {
        return;
      }
      setFormation((prev) =>
        prev.map((s) => (s.position === activeSlot ? { ...s, card } : s))
      );
      // Auto-advance al prossimo slot vuoto
      setFormation((prev) => {
        const nextEmpty = STELLAR_SLOT_ORDER.find(
          (pos) =>
            pos !== activeSlot && !prev.find((s) => s.position === pos)?.card
        );
        setActiveSlot(nextEmpty ?? null);
        return prev;
      });
    },
    [activeSlot]
  );

  const handleClearAll = useCallback(() => {
    setFormation(INITIAL_FORMATION);
    setActiveSlot("POR");
  }, []);

  return (
    <div className="flex gap-6">
      {/* Colonna sinistra: Campo */}
      <div className="sticky top-20 w-full max-w-[420px] shrink-0 self-start">
        <StellarPitchField
          activeSlot={activeSlot}
          formation={formation}
          onCardRemove={handleCardRemove}
          onSlotSelect={handleSlotSelect}
        />
        {formation.some((s) => s.card) && (
          <Button
            className="mt-3 w-full"
            onClick={handleClearAll}
            size="sm"
            variant="ghost"
          >
            Svuota formazione
          </Button>
        )}
      </div>

      {/* Colonna destra: Filtri + Lista carte */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Filtri */}
        <div className="sticky top-0 z-20 space-y-3 bg-[#131317] pt-1 pb-3">
          {/* Ricerca + Ordina + Filtri toggle */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="h-8 w-full rounded-md border border-white/10 bg-[#1E1F2A] pr-3 pl-9 text-sm text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca..."
                type="text"
                value={searchQuery}
              />
            </div>

            <select
              className="h-8 rounded-md border border-white/10 bg-[#1E1F2A] px-2 text-sm text-white focus:border-violet-500 focus:outline-none"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              value={sortBy}
            >
              <option value="l10">L10 ↓</option>
              <option value="projected">Proj ↓</option>
              <option value="name">Nome</option>
              <option value="team">Squadra</option>
            </select>

            <button
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors",
                homeOnly
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : "border-white/10 text-slate-400 hover:text-white"
              )}
              onClick={() => setHomeOnly(!homeOnly)}
              type="button"
            >
              🏠 Casa
            </button>

            <button
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors",
                starterOnly
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : "border-white/10 text-slate-400 hover:text-white"
              )}
              onClick={() => setStarterOnly(!starterOnly)}
              type="button"
            >
              👕 Titolare
            </button>
          </div>

          {/* Filtro date */}
          {availableDates.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-6 shrink-0 text-slate-500 text-xs">Da:</span>
                {availableDates.map((day) => (
                  <button
                    className={cn(
                      "h-7 rounded-md border px-2 text-[11px] transition-colors",
                      dateFrom === day
                        ? "border-violet-500 bg-violet-500/20 text-violet-300"
                        : "border-white/10 text-slate-400 hover:text-white"
                    )}
                    key={day}
                    onClick={() => {
                      if (dateFrom === day) {
                        setDateFrom(null);
                        setDateTo(null);
                      } else {
                        setDateFrom(day);
                        setDateTo(null);
                      }
                    }}
                    type="button"
                  >
                    {formatDateChip(day)}
                  </button>
                ))}
              </div>
              {dateFrom && toDateOptions.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-6 shrink-0 text-slate-500 text-xs">
                    A:
                  </span>
                  {toDateOptions.map((day) => (
                    <button
                      className={cn(
                        "h-7 rounded-md border px-2 text-[11px] transition-colors",
                        dateTo === day
                          ? "border-violet-500 bg-violet-500/20 text-violet-300"
                          : "border-white/10 text-slate-400 hover:text-white"
                      )}
                      key={day}
                      onClick={() => {
                        setDateTo(dateTo === day ? null : day);
                      }}
                      type="button"
                    >
                      {formatDateChip(day)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista carte */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredCards.map((card) => (
            <StellarCardRow
              card={card}
              disabled={!activeSlot}
              key={card.slug}
              onSelect={() => handleCardPlace(card)}
            />
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              Nessuna carta trovata
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StellarCardRow({
  card,
  onSelect,
  disabled,
}: {
  card: StellarFlatCard;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      className={cn(
        "group flex gap-2 rounded-lg border border-white/10 bg-[#1E1F2A] p-2 text-left transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:border-violet-500/40 hover:bg-[#252636]"
      )}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      {/* Immagine + Istogramma */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        {card.pictureUrl ? (
          <img
            alt={card.name}
            className="h-20 w-14 rounded object-cover"
            height={80}
            loading="lazy"
            src={card.pictureUrl}
            width={56}
          />
        ) : (
          <div className="flex h-20 w-14 items-center justify-center rounded bg-white/5">
            <Star className="h-4 w-4 text-slate-600" />
          </div>
        )}
        <ScoreHistogram scores={card.lastScores} />
      </div>

      {/* Info */}
      <div className="min-w-0 space-y-0.5">
        <p className="truncate font-medium text-white text-xs">
          {card.playerName}
        </p>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="rounded bg-violet-500/20 px-1 py-0.5 text-violet-300">
            {card.positions.map((p) => POSITION_ABBR[p] ?? p).join("/")}
          </span>
          <span className="truncate text-slate-500">{card.clubName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-400">
            L10:{" "}
            <span className="text-white">
              {card.l10Average == null ? "-" : card.l10Average.toFixed(0)}
            </span>
          </span>
          <span className="text-slate-400">
            P:{" "}
            <span className="text-emerald-400">
              {card.projectedScore == null
                ? "-"
                : card.projectedScore.toFixed(0)}
            </span>
          </span>
          <span className="text-slate-400">
            T:{" "}
            <span className="text-amber-400">
              {card.starterOdds == null
                ? "-"
                : `${card.starterOdds.toFixed(0)}%`}
            </span>
          </span>
        </div>
        {card.nextGameDate && (
          <div className="space-y-0.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              {formatGameDay(card.nextGameDate)}
            </div>
            {card.nextGameOpponent && (
              <div className="flex items-center gap-0.5">
                {card.nextGameOpponent.startsWith("vs") ? (
                  <Home className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                ) : (
                  <Plane className="h-2.5 w-2.5 shrink-0 text-orange-400" />
                )}
                {card.nextGameOpponent}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
