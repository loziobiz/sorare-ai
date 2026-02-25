"use client";

import { useRouter, useSearch } from "@tanstack/react-router";
import { Check, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useCacheCleanup } from "@/hooks/use-indexed-db";
import { ACTIVE_LEAGUES, SHOW_ONLY_ACTIVE_LEAGUES } from "@/lib/config";
import { DEFAULT_TTL, db } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";
import { fetchAllCards } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { PitchSlot } from "./pitch-slot";

interface LeagueOption {
  value: string;
  label: string;
}

type RarityFilter = "all" | "limited" | "rare";
type SortOption = "name" | "team" | "l5" | "l10" | "l15" | "l40";

// Posizioni disponibili nel campo
type SlotPosition = "ATT" | "EX" | "DIF" | "CEN" | "POR";

interface FormationSlot {
  position: SlotPosition;
  card: CardData | null;
}

// Posizioni Sorare mappate alle slot
const POSITION_MAPPING: Record<SlotPosition, string[]> = {
  ATT: ["Forward"],
  EX: ["Forward", "Midfielder", "Defender"], // Extra può essere qualsiasi posizione
  DIF: ["Defender"],
  CEN: ["Midfielder"],
  POR: ["Goalkeeper"],
};

const INITIAL_FORMATION: FormationSlot[] = [
  { position: "ATT", card: null },
  { position: "EX", card: null },
  { position: "DIF", card: null },
  { position: "CEN", card: null },
  { position: "POR", card: null },
];

// CAP massimo per la somma dei valori L10 della lineup
const L10_CAP = 260;

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
  const newFormation = [...INITIAL_FORMATION];
  if (!saved.slots || saved.slots.length === 0) {
    return newFormation;
  }
  for (const slot of saved.slots) {
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
  const newFormation = [...INITIAL_FORMATION];
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [formation, setFormation] =
    useState<FormationSlot[]>(INITIAL_FORMATION);
  const [activeSlot, setActiveSlot] = useState<SlotPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<string>("");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("l5");
  const [inSeasonOnly, setInSeasonOnly] = useState(false);
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

  useCacheCleanup();

  // Get unique leagues from cards
  const leagues = useMemo((): LeagueOption[] => {
    const leagueMap = buildLeagueMap(cards);
    return Array.from(leagueMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cards]);

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

  const l10Remaining = L10_CAP - l10Used;

  // Carte filtrate per la selezione
  const filteredCards = useMemo(() => {
    let filtered = cards.filter((card) => !usedCardSlugs.has(card.slug));

    // Filtra le carte in cassaforte (mostra solo carte libere)
    filtered = filtered.filter((card) => card.sealed !== true);

    // Filtra per lega se selezionata
    if (leagueFilter) {
      const [leagueName, countryCode] = leagueFilter.split("|");
      filtered = filtered.filter((card) =>
        card.anyPlayer?.activeClub?.activeCompetitions?.some(
          (c) =>
            c.format === "DOMESTIC_LEAGUE" &&
            c.name === leagueName &&
            c.country?.code === countryCode
        )
      );
    }

    // Filtra per rarità
    if (rarityFilter !== "all") {
      filtered = filtered.filter(
        (card) => card.rarityTyped.toLowerCase() === rarityFilter
      );
    }

    // Filtra per posizione se c'è uno slot attivo
    if (activeSlot) {
      const allowedPositions = POSITION_MAPPING[activeSlot];
      filtered = filtered.filter((card) =>
        card.anyPositions?.some((pos) => allowedPositions.includes(pos))
      );
    }

    // Filtra per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.name.toLowerCase().includes(query) ||
          card.anyPlayer?.activeClub?.name?.toLowerCase().includes(query)
      );
    }

    // Filtra per in-season eligibility
    if (inSeasonOnly) {
      filtered = filtered.filter((card) => card.inSeasonEligible === true);
    }

    // Filtra per CAP L10 - mostra solo giocatori compatibili
    filtered = filtered.filter(
      (card) => (card.l10Average ?? 0) <= l10Remaining
    );

    // Ordina secondo il criterio selezionato
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "team":
          return (a.anyPlayer?.activeClub?.name ?? "").localeCompare(
            b.anyPlayer?.activeClub?.name ?? ""
          );
        case "l5":
          return (b.l5Average ?? 0) - (a.l5Average ?? 0);
        case "l10":
          return (b.l10Average ?? 0) - (a.l10Average ?? 0);
        case "l15":
          return (b.l15Average ?? 0) - (a.l15Average ?? 0);
        case "l40":
          return (b.l40Average ?? 0) - (a.l40Average ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    cards,
    usedCardSlugs,
    leagueFilter,
    rarityFilter,
    activeSlot,
    searchQuery,
    sortBy,
    inSeasonOnly,
    l10Remaining,
  ]);

  // Calcola bonus formazione (simulato)
  const _formationBonus = useMemo(() => {
    const filledSlots = formation.filter((s) => s.card).length;
    return filledSlots >= 3 ? 2 : 0;
  }, [formation]);

  const loadCardsFromDb = useCallback(async (): Promise<boolean> => {
    try {
      const cached = await db.cache.get("user_cards");
      if (!cached) {
        return false;
      }

      const { timestamp, value, ttl } = cached;
      const cacheAge = Date.now() - timestamp;
      if (ttl && cacheAge > ttl) {
        await db.cache.delete("user_cards");
        return false;
      }

      const data = value as { cards: CardData[]; userSlug: string };
      setCards(data.cards);
      setIsLoading(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const saveCardsToDb = useCallback(
    async (cardsData: CardData[], userSlug: string) => {
      await db.cache.put({
        key: "user_cards",
        value: { cards: cardsData, userSlug },
        timestamp: Date.now(),
        ttl: DEFAULT_TTL.LONG,
      });
    },
    []
  );

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await fetchAllCards({
        enablePagination: true,
      });
      setCards(result.cards);
      await saveCardsToDb(result.cards, result.userSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
    } finally {
      setIsLoading(false);
    }
  }, [saveCardsToDb]);

  const loadCards = useCallback(async () => {
    const found = await loadCardsFromDb();
    if (!found) {
      await fetchCards();
    }
  }, [loadCardsFromDb, fetchCards]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

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

    // Verifica CAP L10
    const cardL10 = card.l10Average ?? 0;
    if (cardL10 > l10Remaining) {
      setError(
        `Impossibile aggiungere: L10 ${cardL10.toFixed(0)} supera il residuo ${l10Remaining.toFixed(0)}`
      );
      return;
    }

    setFormation((prev) => {
      const updated = prev.map((s) =>
        s.position === activeSlot ? { ...s, card } : s
      );

      // Auto-select next empty slot in order: POR -> DIF -> CEN -> ATT -> EX
      const slotOrder: SlotPosition[] = ["POR", "DIF", "CEN", "ATT", "EX"];
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

  const handleConfirmFormation = async () => {
    const filledSlots = formation.filter((s) => s.card).length;
    if (filledSlots < 5) {
      setError("Completa la formazione prima di confermare");
      return;
    }
    if (!formationName.trim()) {
      setError("Inserisci un nome per la formazione");
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

      if (editingId) {
        // Update existing formation
        await db.savedFormations.update(editingId, {
          name: formationName.trim(),
          league: leagueFilter,
          cards: formationCards,
          slots,
        });
        showToast(setToasts, "Formazione aggiornata con successo!", "success");
      } else {
        // Create new formation
        await db.savedFormations.add({
          name: formationName.trim(),
          league: leagueFilter,
          cards: formationCards,
          slots,
          createdAt: Date.now(),
        });
        showToast(setToasts, "Formazione salvata con successo!", "success");
      }

      // Reset and redirect
      setFormationName("");
      setFormation(INITIAL_FORMATION);
      setEditingId(null);
      setError("");
      router.navigate({ to: "/saved-lineups" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  };

  if (isLoading) {
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
              placeholder="Nome formazione (obbligatorio)"
              required
              value={formationName}
            />
            <div className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2">
              <span className="font-medium text-slate-600 text-sm">
                CAP L10:
              </span>
              <span
                className={cn(
                  "font-bold text-sm",
                  l10Remaining < 0 && "text-red-600",
                  l10Remaining >= 0 && l10Remaining < 50 && "text-orange-500",
                  l10Remaining >= 50 && "text-emerald-600"
                )}
              >
                {l10Remaining.toFixed(0)}/{L10_CAP}
              </span>
            </div>
          </div>

          {/* Bottone conferma */}
          <Button
            className="mb-2 h-9 gap-2 bg-violet-600 font-semibold text-base hover:bg-violet-700"
            disabled={
              !formationName.trim() ||
              formation.filter((s) => s.card).length < 5
            }
            onClick={handleConfirmFormation}
          >
            <Check className="h-5 w-5" />
            {editingId ? "Aggiorna formazione" : "Salva formazione"}
          </Button>

          {error && (
            <Alert className="mb-3" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Campo di calcio */}
          <div className="relative flex aspect-[21/31] flex-col overflow-hidden rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-lg">
            {/* Linee del campo */}
            <div className="absolute inset-5 rounded-lg border-2 border-white/30" />
            <div className="absolute top-1/2 right-5 left-5 h-0.5 -translate-y-1/2 bg-white/30" />
            <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
            <div className="absolute bottom-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-b-0" />
            <div className="absolute top-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-t-0" />

            {/* Slot posizioni */}
            <div className="relative z-10 flex h-full flex-col justify-between gap-2 px-4 py-3">
              {/* Riga alta - ATT ed EX */}
              <div className="flex justify-around">
                <PitchSlot
                  card={
                    formation.find((s) => s.position === "ATT")?.card ?? null
                  }
                  isActive={activeSlot === "ATT"}
                  label="ATT"
                  onClick={() => handleSlotClick("ATT")}
                />
                <PitchSlot
                  card={
                    formation.find((s) => s.position === "EX")?.card ?? null
                  }
                  isActive={activeSlot === "EX"}
                  label="EX"
                  onClick={() => handleSlotClick("EX")}
                />
              </div>

              {/* Riga centrale - DIF e CEN */}
              <div className="flex justify-around">
                <PitchSlot
                  card={
                    formation.find((s) => s.position === "DIF")?.card ?? null
                  }
                  isActive={activeSlot === "DIF"}
                  label="DIF"
                  onClick={() => handleSlotClick("DIF")}
                />
                <PitchSlot
                  card={
                    formation.find((s) => s.position === "CEN")?.card ?? null
                  }
                  isActive={activeSlot === "CEN"}
                  label="CEN"
                  onClick={() => handleSlotClick("CEN")}
                />
              </div>

              {/* Riga bassa - POR */}
              <div className="flex justify-center">
                <PitchSlot
                  card={
                    formation.find((s) => s.position === "POR")?.card ?? null
                  }
                  isActive={activeSlot === "POR"}
                  label="POR"
                  onClick={() => handleSlotClick("POR")}
                />
              </div>
            </div>
          </div>
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
                    setFormation(INITIAL_FORMATION);
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
              {/* Ordina per */}
              <div className="flex items-center gap-2">
                <label className="font-medium text-sm" htmlFor="sort-by">
                  Ordina:
                </label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="sort-by"
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  value={sortBy}
                >
                  <option value="name">Nome</option>
                  <option value="team">Squadra</option>
                  <option value="l5">Media L5</option>
                  <option value="l15">Media L15</option>
                  <option value="l40">Media L40</option>
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
