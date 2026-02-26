"use client";

import { useRouter, useSearch } from "@tanstack/react-router";
import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SorareCard } from "@/components/cards/card";
import {
  CardsList,
  COLUMN_WIDTHS,
  getSortIcon,
  type SortDirection,
  type SortKey,
} from "@/components/cards/cards-list";
import { type ViewMode, ViewToggle } from "@/components/cards/view-toggle";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { showToast, ToastContainer } from "@/components/ui/toast";
import { useCards } from "@/hooks/use-cards";
import { ACTIVE_LEAGUES, SHOW_ONLY_ACTIVE_LEAGUES } from "@/lib/config";
import { db } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { PitchField } from "./pitch-field";
import { useFilteredCards } from "./use-filtered-cards";

interface LeagueOption {
  value: string;
  label: string;
}

type RarityFilter = "all" | "limited" | "rare";
type SortOption = "name" | "team" | "l5" | "l10" | "l15" | "l40";

// Posizioni disponibili nel campo (base 5)
export type SlotPosition5 = "ATT" | "EX" | "DIF" | "CEN" | "POR";
// Posizioni disponibili nel campo (Pro GAS 7)
export type SlotPosition7 = "ATT1" | "EXT" | "CEN2" | "DIF1" | "CEN1" | "DIF2" | "POR";
export type SlotPosition = SlotPosition5 | SlotPosition7;

export interface FormationSlot {
  position: SlotPosition;
  card: CardData | null;
}

// Posizioni Sorare mappate alle slot
export const POSITION_MAPPING: Record<SlotPosition, string[]> = {
  // 5 giocatori
  ATT: ["Forward"],
  EX: ["Forward", "Midfielder", "Defender"],
  DIF: ["Defender"],
  CEN: ["Midfielder"],
  // 7 giocatori (Pro GAS)
  ATT1: ["Forward"],
  EXT: ["Forward", "Midfielder", "Defender"],
  CEN2: ["Midfielder"],
  DIF1: ["Defender"],
  CEN1: ["Midfielder"],
  DIF2: ["Defender"],
  // Comuni
  POR: ["Goalkeeper"],
};

// Configurazioni formazione per modalità
export type GameMode = "uncapped" | 260 | 220 | "pro_gas";

export interface GameModeConfig {
  label: string;
  slotCount: 5 | 7;
  cap: number | null;
  formation: SlotPosition[];
}

const GAME_MODES: Record<GameMode, GameModeConfig> = {
  uncapped: {
    label: "ARENA NO CAP",
    slotCount: 5,
    cap: null,
    formation: ["ATT", "EX", "DIF", "CEN", "POR"],
  },
  260: {
    label: "ARENA 260",
    slotCount: 5,
    cap: 260,
    formation: ["ATT", "EX", "DIF", "CEN", "POR"],
  },
  220: {
    label: "ARENA 220",
    slotCount: 5,
    cap: 220,
    formation: ["ATT", "EX", "DIF", "CEN", "POR"],
  },
  pro_gas: {
    label: "Pro GAS",
    slotCount: 7,
    cap: null,
    formation: ["ATT1", "EXT", "CEN2", "DIF1", "CEN1", "DIF2", "POR"],
  },
};

const GAME_MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: "uncapped", label: "ARENA NO CAP" },
  { value: 260, label: "ARENA 260" },
  { value: 220, label: "ARENA 220" },
  { value: "pro_gas", label: "PRO GAS" },
];

function getInitialFormation(mode: GameMode): FormationSlot[] {
  return GAME_MODES[mode].formation.map((pos) => ({
    position: pos,
    card: null,
  }));
}

function getEmptyMessage(
  leagueFilter: string,
  activeSlot: SlotPosition | null
): string {
  if (!leagueFilter) {
    return "Seleziona una lega per vedere le carte disponibili";
  }
  if (!activeSlot) {
    return "Seleziona uno slot per vedere le carte disponibili";
  }
  return "Nessuna carta disponibile per questa posizione";
}

function isLeagueAllowed(uniqueKey: string): boolean {
  return !SHOW_ONLY_ACTIVE_LEAGUES || Object.hasOwn(ACTIVE_LEAGUES, uniqueKey);
}

function getLeagueDisplayName(uniqueKey: string): string {
  const customName = ACTIVE_LEAGUES[uniqueKey];
  return customName ?? uniqueKey;
}

function buildLeagueMap(cards: CardData[]): Map<string, string> {
  const leagueMap = new Map<string, string>();
  for (const card of cards) {
    for (const competition of card.anyPlayer?.activeClub?.activeCompetitions ??
      []) {
      if (competition.name === "NBA") {
        leagueMap.set("NBA", "NBA");
      } else if (
        competition.format === "DOMESTIC_LEAGUE" &&
        competition.country
      ) {
        const uniqueKey = `${competition.name}|${competition.country.code}`;
        if (isLeagueAllowed(uniqueKey)) {
          leagueMap.set(uniqueKey, getLeagueDisplayName(uniqueKey));
        }
      }
    }
  }
  return leagueMap;
}

interface SavedFormationWithSlots {
  name: string;
  league: string;
  cards: CardData[];
  slots?: Array<{ position: string; cardSlug: string }>;
}

function restoreFormationFromSlots(
  saved: SavedFormationWithSlots
): FormationSlot[] {
  // Ricostruisci la formazione basandoti sugli slot salvati
  const positions = saved.slots?.map((s) => s.position as SlotPosition) ?? [];
  const uniquePositions = [...new Set(positions)];
  const newFormation: FormationSlot[] = uniquePositions.map((pos) => ({
    position: pos,
    card: null,
  }));

  // Se vuota, ritorna formazione default a 5
  if (newFormation.length === 0) {
    return GAME_MODES[260].formation.map((pos) => ({
      position: pos,
      card: null,
    }));
  }

  for (const slot of saved.slots ?? []) {
    const card = saved.cards.find((c) => c.slug === slot.cardSlug);
    if (card) {
      const slotIndex = newFormation.findIndex(
        (s) => s.position === slot.position
      );
      if (slotIndex !== -1) {
        newFormation[slotIndex] = {
          position: slot.position as SlotPosition,
          card,
        };
      }
    }
  }
  return newFormation;
}

function restoreFormationLegacy(
  saved: SavedFormationWithSlots
): FormationSlot[] {
  // Legacy: usa sempre formazione a 5
  const newFormation = GAME_MODES[260].formation.map((pos) => ({
    position: pos,
    card: null as CardData | null,
  }));
  for (const savedCard of saved.cards) {
    const position = getPositionForCard(savedCard);
    if (position) {
      const slotIndex = newFormation.findIndex((s) => s.position === position);
      if (slotIndex !== -1) {
        newFormation[slotIndex] = { position, card: savedCard };
      }
    }
  }
  return newFormation;
}

function loadSavedFormation(saved: SavedFormationWithSlots): FormationSlot[] {
  if (saved.slots && saved.slots.length > 0) {
    return restoreFormationFromSlots(saved);
  }
  return restoreFormationLegacy(saved);
}

// Helper to determine slot position from card positions
function getPositionForCard(card: CardData): SlotPosition | null {
  if (!card.anyPositions || card.anyPositions.length === 0) {
    return null;
  }

  const position = card.anyPositions[0];
  if (position === "Goalkeeper") {
    return "POR";
  }
  if (position === "Defender") {
    return "DIF";
  }
  if (position === "Midfielder") {
    return "CEN";
  }
  if (position === "Forward") {
    return "ATT";
  }

  return null;
}

export function LineupBuilder() {
  const router = useRouter();
  const search = useSearch({ from: "/lineup" });
  const searchParams = new URLSearchParams(search as Record<string, string>);
  const {
    cards,
    error: cardsError,
    isLoading: isCardsLoading,
    isRefreshing: isCardsRefreshing,
  } = useCards();
  const [error, setError] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>(260);
  const [formation, setFormation] = useState<FormationSlot[]>(
    getInitialFormation(260)
  );
  const [activeSlot, setActiveSlot] = useState<SlotPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<string>("");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("l5");
  const [inSeasonOnly, setInSeasonOnly] = useState(false);
  const [showUsedCards, setShowUsedCards] = useState(false);
  const [savedFormationsCards, setSavedFormationsCards] = useState<Map<string, string>>(new Map());
  const [formationName, setFormationName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tableSortKey, setTableSortKey] = useState<SortKey>("name");
  const [tableSortDirection, setTableSortDirection] =
    useState<SortDirection>("asc");

  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type?: "success" | "error" | "info" }>
  >([]);

  const handleTableSort = (key: SortKey, direction: SortDirection) => {
    setTableSortKey(key);
    setTableSortDirection(direction);
  };

  // Get unique leagues from cards
  const leagues = useMemo((): LeagueOption[] => {
    const leagueMap = buildLeagueMap(cards);
    return Array.from(leagueMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cards]);

  // Carica le formazioni salvate per identificare giocatori già utilizzati
  useEffect(() => {
    const loadSavedFormations = async () => {
      const formations = await db.savedFormations.toArray();
      const slugToFormation = new Map<string, string>();
      for (const formation of formations) {
        for (const card of formation.cards) {
          if (card.slug) {
            slugToFormation.set(card.slug, formation.name);
          }
        }
      }
      setSavedFormationsCards(slugToFormation);
    };
    loadSavedFormations();
  }, []);

  // Carte già usate nella formazione
  const usedCardSlugs = useMemo(
    () => new Set(formation.filter((s) => s.card).map((s) => s.card?.slug)),
    [formation]
  );

  // Calcola residuo CAP L10
  const l10Used = useMemo(() => {
    return formation.reduce((sum, slot) => {
      return sum + (slot.card?.l10Average ?? 0);
    }, 0);
  }, [formation]);

  const gameModeConfig = GAME_MODES[gameMode];
  const l10Cap =
    gameModeConfig.cap === null ? Number.POSITIVE_INFINITY : gameModeConfig.cap;
  const l10Remaining = l10Cap - l10Used;

  // Carte filtrate per la selezione
  const filteredCards = useFilteredCards({
    cards,
    usedCardSlugs,
    leagueFilter,
    rarityFilter,
    activeSlot,
    searchQuery,
    sortBy,
    inSeasonOnly,
    l10Remaining,
    cap: gameModeConfig.cap,
    positionMapping: POSITION_MAPPING,
    savedFormationsCards,
    showUsedCards,
  });

  // Calcola bonus formazione (simulato)
  const _formationBonus = useMemo(() => {
    const filledSlots = formation.filter((s) => s.card).length;
    return filledSlots >= 3 ? 2 : 0;
  }, [formation]);

  // Load formation for editing
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!(editId && cards.length)) {
      return;
    }

    const loadFormation = async () => {
      try {
        const id = Number.parseInt(editId, 10);
        const saved = await db.savedFormations.get(id);
        if (saved) {
          setEditingId(id);
          setFormationName(saved.name);
          setLeagueFilter(saved.league);
          // Carica il gameMode salvato o usa il default 260 per compatibilità legacy
          const savedGameMode = saved.gameMode ?? 260;
          setGameMode(savedGameMode);
          setFormation(loadSavedFormation(saved));
        }
      } catch (err) {
        console.error("Error loading formation:", err);
      }
    };

    loadFormation();
  }, [searchParams, cards]);

  const handleSlotClick = (position: SlotPosition) => {
    const slot = formation.find((s) => s.position === position);
    if (slot?.card) {
      // Rimuovi la carta dallo slot
      setFormation((prev) =>
        prev.map((s) => (s.position === position ? { ...s, card: null } : s))
      );
      setActiveSlot(null);
    } else {
      // Attiva lo slot per la selezione
      setActiveSlot(activeSlot === position ? null : position);
    }
  };

  const handleCardSelect = (card: CardData) => {
    if (!activeSlot) {
      return;
    }

    // Verifica CAP L10 (solo se la modalità ha un cap)
    if (gameModeConfig.cap !== null) {
      const cardL10 = card.l10Average ?? 0;
      if (cardL10 > l10Remaining) {
        setError(
          `Impossibile aggiungere: L10 ${cardL10.toFixed(0)} supera il residuo ${l10Remaining.toFixed(0)}`
        );
        return;
      }
    }

    setFormation((prev) => {
      const updated = prev.map((s) =>
        s.position === activeSlot ? { ...s, card } : s
      );

      // Auto-select next empty slot based on game mode
      const slotOrder: SlotPosition[] =
        gameMode === "pro_gas"
          ? ["POR", "DIF1", "DIF2", "CEN1", "CEN2", "ATT1", "EXT"]
          : ["POR", "DIF", "CEN", "ATT", "EX"];
      const currentIndex = slotOrder.indexOf(activeSlot);
      let nextIndex = (currentIndex + 1) % slotOrder.length;
      let foundNext = false;

      // Find the next empty slot, cycling through the order
      for (const _ of slotOrder) {
        const nextPosition = slotOrder[nextIndex];
        const slot = updated.find((s) => s.position === nextPosition);
        if (slot && !slot.card) {
          setActiveSlot(nextPosition);
          foundNext = true;
          break;
        }
        nextIndex = (nextIndex + 1) % slotOrder.length;
      }

      // If no empty slot found, clear active slot
      if (!foundNext) {
        setActiveSlot(null);
      }

      return updated;
    });
    setSearchQuery("");
  };

  // Ottieni il nome effettivo della formazione (quello inserito o il default della modalità)
  const getEffectiveFormationName = (): string => {
    const trimmed = formationName.trim();
    if (trimmed) {
      return trimmed;
    }
    return gameModeConfig.label;
  };

  const handleConfirmFormation = async () => {
    const filledSlots = formation.filter((s) => s.card).length;
    if (filledSlots < gameModeConfig.slotCount) {
      setError("Completa la formazione prima di confermare");
      return;
    }

    try {
      const formationCards = formation
        .map((s) => s.card)
        .filter((c): c is CardData => c !== null);

      // Save slot positions to preserve formation layout
      const slots = formation
        .filter((s) => s.card !== null)
        .map((s) => ({ position: s.position, cardSlug: s.card?.slug ?? "" }))
        .filter((s) => s.cardSlug !== "");

      const effectiveName = getEffectiveFormationName();

      if (editingId) {
        // Update existing formation
        await db.savedFormations.update(editingId, {
          name: effectiveName,
          league: leagueFilter,
          cards: formationCards,
          slots,
          gameMode,
        });
        showToast(setToasts, "Formazione aggiornata con successo!", "success");
      } else {
        // Create new formation
        await db.savedFormations.add({
          name: effectiveName,
          league: leagueFilter,
          cards: formationCards,
          slots,
          gameMode,
          createdAt: Date.now(),
        });
        showToast(setToasts, "Formazione salvata con successo!", "success");
      }

      // Reset and redirect
      setFormationName("");
      setFormation(getInitialFormation(gameMode));
      setEditingId(null);
      setError("");
      router.navigate({ to: "/saved-lineups" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  };

  const displayError = error || cardsError;

  if (isCardsLoading || isCardsRefreshing) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoadingSpinner icon="loader" message="Caricamento carte..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        toasts={toasts}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        {/* Sezione sinistra - Campo di calcio */}
        <div className="flex max-h-[calc(100vh-6rem)] shrink-0 flex-col overflow-y-auto lg:w-[420px]">
          {/* Nome formazione e CAP L10 */}
          <div className="mb-3 space-y-2">
            <Input
              className="h-9"
              id="formation-name"
              onChange={(e) => setFormationName(e.target.value)}
              placeholder={`Nome formazione (default: ${gameModeConfig.label})`}
              value={formationName}
            />
            <div className="flex items-center gap-2">
              <label
                className="whitespace-nowrap font-medium text-sm"
                htmlFor="cap-select"
              >
                Modalità:
              </label>
              <select
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="cap-select"
                onChange={(e) => {
                  const newMode = e.target.value as GameMode;
                  setGameMode(newMode);
                  setFormation(getInitialFormation(newMode));
                  setActiveSlot(null);
                }}
                value={gameMode}
              >
                {GAME_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {gameModeConfig.cap !== null && (
              <div className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2">
                <span className="font-medium text-slate-600 text-sm">
                  Residuo:
                </span>
                <span
                  className={cn(
                    "font-bold text-sm",
                    l10Remaining < 0 && "text-red-600",
                    l10Remaining >= 0 && l10Remaining < 50 && "text-orange-500",
                    l10Remaining >= 50 && "text-emerald-600"
                  )}
                >
                  {l10Remaining.toFixed(0)}/{gameModeConfig.cap}
                </span>
              </div>
            )}
          </div>

          {/* Bottone conferma */}
          <Button
            className="mb-2 h-9 gap-2 bg-violet-600 font-semibold text-base hover:bg-violet-700"
            disabled={
              formation.filter((s) => s.card).length < gameModeConfig.slotCount
            }
            onClick={handleConfirmFormation}
          >
            <Check className="h-5 w-5" />
            {editingId ? "Aggiorna formazione" : "Salva formazione"}
          </Button>

          {displayError && (
            <Alert className="mb-3" variant="destructive">
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          {/* Campo di calcio */}
          <PitchField
            activeSlot={activeSlot}
            formation={formation}
            gameMode={gameMode}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Sezione destra - Collezione carte */}
        <div className="flex max-h-[calc(100vh-6rem)] max-w-[1000px] flex-1 flex-col">
          {/* Header e filtri sticky */}
          <div className="sticky top-0 z-20 bg-white pb-2">
            {/* Header selezione */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-xl">
                Seleziona{" "}
                {activeSlot ? (
                  <span className="text-violet-600">{activeSlot}</span>
                ) : (
                  "Giocatore"
                )}
              </h2>
              <ViewToggle onViewModeChange={setViewMode} viewMode={viewMode} />
            </div>

            {/* Barra di ricerca e filtri */}
            <div className="mb-4 flex flex-wrap gap-3">
              {/* Lega */}
              <div className="flex items-center gap-2">
                <label className="font-medium text-sm" htmlFor="league-filter">
                  Lega:
                </label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="league-filter"
                  onChange={(e) => {
                    setLeagueFilter(e.target.value);
                    // Reset formation when league changes
                    setFormation(getInitialFormation(gameMode));
                    setActiveSlot(null);
                  }}
                  value={leagueFilter}
                >
                  <option value="">Seleziona lega</option>
                  {leagues.map((league) => (
                    <option key={league.value} value={league.value}>
                      {league.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Rarità */}
              <div className="flex items-center gap-2">
                <label className="font-medium text-sm" htmlFor="rarity-filter">
                  Rarità:
                </label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="rarity-filter"
                  onChange={(e) =>
                    setRarityFilter(e.target.value as RarityFilter)
                  }
                  value={rarityFilter}
                >
                  <option value="all">Tutte</option>
                  <option value="limited">Limited</option>
                  <option value="rare">Rare</option>
                </select>
              </div>
              {/* In-Season Filter */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={inSeasonOnly}
                  id="in-season-filter"
                  onCheckedChange={(checked) =>
                    setInSeasonOnly(checked === true)
                  }
                />
                <label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="in-season-filter"
                >
                  In-Season
                </label>
              </div>
              {/* Mostra utilizzati */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={showUsedCards}
                  id="show-used-cards"
                  onCheckedChange={(checked) =>
                    setShowUsedCards(checked === true)
                  }
                />
                <label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="show-used-cards"
                >
                  Mostra utilizzati
                </label>
              </div>
              {/* Nome */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-700 placeholder:text-slate-400"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca giocatore..."
                  value={searchQuery}
                />
              </div>
            </div>

            {/* Header tabella sticky - solo in vista lista */}
            {viewMode === "list" && (
              <div className="mt-2 overflow-x-auto rounded-t-md border border-b-0 bg-white">
                <table className="w-full max-w-[1000px] table-fixed text-sm">
                  <thead>
                    <tr className="border-b">
                      <th
                        className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                        onClick={() =>
                          handleTableSort(
                            "name",
                            tableSortKey === "name" &&
                              tableSortDirection === "asc"
                              ? "desc"
                              : "asc"
                          )
                        }
                        style={{ width: COLUMN_WIDTHS.name }}
                      >
                        <div className="flex items-center">
                          Giocatore
                          {getSortIcon(
                            "name",
                            tableSortKey,
                            tableSortDirection
                          )}
                        </div>
                      </th>
                      <th
                        className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                        onClick={() =>
                          handleTableSort(
                            "team",
                            tableSortKey === "team" &&
                              tableSortDirection === "asc"
                              ? "desc"
                              : "asc"
                          )
                        }
                        style={{ width: COLUMN_WIDTHS.team }}
                      >
                        <div className="flex items-center">
                          Squadra
                          {getSortIcon(
                            "team",
                            tableSortKey,
                            tableSortDirection
                          )}
                        </div>
                      </th>
                      <th
                        className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground"
                        style={{ width: COLUMN_WIDTHS.match }}
                      >
                        <div className="flex items-center">Prossima</div>
                      </th>
                      <th
                        className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground"
                        style={{ width: COLUMN_WIDTHS.forma }}
                      >
                        <div className="flex items-center">Forma</div>
                      </th>
                      <th
                        className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                        onClick={() =>
                          handleTableSort(
                            "l5",
                            tableSortKey === "l5" &&
                              tableSortDirection === "asc"
                              ? "desc"
                              : "asc"
                          )
                        }
                        style={{ width: COLUMN_WIDTHS.l5 }}
                      >
                        <div className="flex items-center">
                          L5
                          {getSortIcon("l5", tableSortKey, tableSortDirection)}
                        </div>
                      </th>
                      <th
                        className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                        onClick={() =>
                          handleTableSort(
                            "l10",
                            tableSortKey === "l10" &&
                              tableSortDirection === "asc"
                              ? "desc"
                              : "asc"
                          )
                        }
                        style={{ width: COLUMN_WIDTHS.l10 }}
                      >
                        <div className="flex items-center">
                          L10
                          {getSortIcon("l10", tableSortKey, tableSortDirection)}
                        </div>
                      </th>
                      <th
                        className="h-10 cursor-pointer select-none whitespace-nowrap px-2 text-left align-middle font-medium text-foreground hover:bg-muted/80"
                        onClick={() =>
                          handleTableSort(
                            "l40",
                            tableSortKey === "l40" &&
                              tableSortDirection === "asc"
                              ? "desc"
                              : "asc"
                          )
                        }
                        style={{ width: COLUMN_WIDTHS.l40 }}
                      >
                        <div className="flex items-center">
                          L40
                          {getSortIcon("l40", tableSortKey, tableSortDirection)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
            )}
          </div>

          {/* Griglia o Tabella carte - scrollabile */}
          <div className="flex-1 overflow-y-auto">
            {viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCards.map((card) => (
                    <button
                      aria-label={`Seleziona ${card.name}`}
                      className={cn(
                        "text-left transition-all",
                        activeSlot
                          ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg"
                          : "cursor-not-allowed opacity-50"
                      )}
                      disabled={!activeSlot}
                      key={card.slug}
                      onClick={() => handleCardSelect(card)}
                      type="button"
                    >
                      <SorareCard
                        card={card}
                        showAverages
                        showPositions={false}
                      />
                    </button>
                  ))}
                </div>

                {filteredCards.length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    {getEmptyMessage(leagueFilter, activeSlot)}
                  </div>
                )}
              </>
            ) : (
              <CardsList
                cards={filteredCards}
                disabled={!activeSlot}
                emptyMessage={getEmptyMessage(leagueFilter, activeSlot)}
                markedCards={showUsedCards ? savedFormationsCards : undefined}
                onCardClick={handleCardSelect}
                onSort={handleTableSort}
                showHeader={false}
                sortDirection={tableSortDirection}
                sortKey={tableSortKey}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
