"use client";

import { ArrowLeft, Check, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SorareCard } from "@/components/cards/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCacheCleanup } from "@/hooks/use-indexed-db";
import { DEFAULT_TTL, db } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";
import { fetchAllCards } from "@/lib/sorare-api";
import { cn } from "@/lib/utils";
import { PitchSlot } from "./pitch-slot";

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

export function LineupBuilder() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [formation, setFormation] =
    useState<FormationSlot[]>(INITIAL_FORMATION);
  const [activeSlot, setActiveSlot] = useState<SlotPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useCacheCleanup();

  // Carte già usate nella formazione
  const usedCardSlugs = useMemo(
    () => new Set(formation.filter((s) => s.card).map((s) => s.card?.slug)),
    [formation]
  );

  // Carte filtrate per la selezione
  const filteredCards = useMemo(() => {
    let filtered = cards.filter((card) => !usedCardSlugs.has(card.slug));

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

    // Ordina per media L5 (decrescente)
    return filtered.sort((a, b) => (b.l5Average ?? 0) - (a.l5Average ?? 0));
  }, [cards, usedCardSlugs, activeSlot, searchQuery]);

  // Calcola bonus formazione (simulato)
  const formationBonus = useMemo(() => {
    const filledSlots = formation.filter((s) => s.card).length;
    return filledSlots >= 3 ? 2 : 0;
  }, [formation]);

  // Calcola CAP
  const capInfo = useMemo(() => {
    const total = formation.reduce(
      (sum, slot) => sum + (slot.card?.l5Average ?? 0),
      0
    );
    const max = 260;
    return { current: Math.round(total), max, bonus: formationBonus };
  }, [formation, formationBonus]);

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

    setFormation((prev) =>
      prev.map((s) => (s.position === activeSlot ? { ...s, card } : s))
    );
    setActiveSlot(null);
    setSearchQuery("");
  };

  const handleConfirmFormation = () => {
    const filledSlots = formation.filter((s) => s.card).length;
    if (filledSlots < 5) {
      setError("Completa la formazione prima di confermare");
      return;
    }
    // TODO: Invia formazione
    console.log("Formazione confermata:", formation);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoadingSpinner icon="loader" message="Caricamento carte..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      {/* Sezione sinistra - Campo di calcio */}
      <div className="flex flex-col lg:sticky lg:top-4 lg:w-[520px]">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/cards">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-2xl text-slate-800">Formazione</h1>
        </div>

        {/* Campo di calcio */}
        <div className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-700 shadow-xl">
          {/* Linee del campo */}
          <div className="absolute inset-5 rounded-lg border-2 border-white/30" />
          <div className="absolute top-1/2 right-5 left-5 h-0.5 -translate-y-1/2 bg-white/30" />
          <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
          <div className="absolute bottom-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-b-0" />
          <div className="absolute top-5 left-1/2 h-24 w-40 -translate-x-1/2 border-2 border-white/30 border-t-0" />

          {/* Slot posizioni */}
          <div className="relative z-10 flex h-full flex-col justify-between p-8">
            {/* Riga alta - ATT ed EX */}
            <div className="flex justify-around">
              <PitchSlot
                card={formation.find((s) => s.position === "ATT")?.card ?? null}
                isActive={activeSlot === "ATT"}
                label="ATT"
                onClick={() => handleSlotClick("ATT")}
              />
              <PitchSlot
                card={formation.find((s) => s.position === "EX")?.card ?? null}
                isActive={activeSlot === "EX"}
                label="EX"
                onClick={() => handleSlotClick("EX")}
              />
            </div>

            {/* Riga centrale - DIF e CEN */}
            <div className="flex justify-around">
              <PitchSlot
                card={formation.find((s) => s.position === "DIF")?.card ?? null}
                isActive={activeSlot === "DIF"}
                label="DIF"
                onClick={() => handleSlotClick("DIF")}
              />
              <PitchSlot
                card={formation.find((s) => s.position === "CEN")?.card ?? null}
                isActive={activeSlot === "CEN"}
                label="CEN"
                onClick={() => handleSlotClick("CEN")}
              />
            </div>

            {/* Riga bassa - POR */}
            <div className="flex justify-center">
              <PitchSlot
                card={formation.find((s) => s.position === "POR")?.card ?? null}
                isActive={activeSlot === "POR"}
                label="POR"
                onClick={() => handleSlotClick("POR")}
              />
            </div>
          </div>
        </div>

        {/* Bottone conferma */}
        <Button
          className="mt-4 h-14 gap-2 bg-violet-600 font-semibold text-lg hover:bg-violet-700"
          disabled={formation.filter((s) => s.card).length < 5}
          onClick={handleConfirmFormation}
        >
          <Check className="h-5 w-5" />
          Conferma formazione
        </Button>

        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Sezione destra - Collezione carte */}
      <div className="flex-1">
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
        </div>

        {/* Barra di ricerca */}
        <div className="relative mb-4">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-700 placeholder:text-slate-400"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca giocatore..."
            value={searchQuery}
          />
        </div>

        {/* Griglia carte */}
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
              <SorareCard card={card} showAverages showPositions={false} />
            </button>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            {activeSlot
              ? "Nessuna carta disponibile per questa posizione"
              : "Seleziona uno slot per vedere le carte disponibili"}
          </div>
        )}
      </div>
    </div>
  );
}
