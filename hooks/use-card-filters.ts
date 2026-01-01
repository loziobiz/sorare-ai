"use client";

import { useMemo, useState } from "react";
import {
  type CardFilters,
  extractLeagues,
  filterAndSortCards,
  type LeagueOption,
  type PositionFilter,
  type RarityFilter,
  type SortOption,
} from "@/lib/cards-utils";
import type { CardData } from "@/lib/sorare-api";

interface UseCardFiltersReturn {
  filters: CardFilters;
  setRarity: (rarity: RarityFilter) => void;
  setPosition: (position: PositionFilter) => void;
  setLeague: (league: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setInSeasonOnly: (inSeasonOnly: boolean) => void;
  leagues: LeagueOption[];
  filteredCards: CardData[];
}

export function useCardFilters(cards: CardData[]): UseCardFiltersReturn {
  const [rarity, setRarity] = useState<RarityFilter>("all");
  const [position, setPosition] = useState<PositionFilter>("all");
  const [league, setLeague] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [inSeasonOnly, setInSeasonOnly] = useState(false);

  const filters: CardFilters = useMemo(
    () => ({
      rarity,
      position,
      league,
      sortBy,
      inSeasonOnly,
    }),
    [rarity, position, league, sortBy, inSeasonOnly]
  );

  const leagues = useMemo(() => extractLeagues(cards), [cards]);

  const filteredCards = useMemo(
    () => filterAndSortCards(cards, filters),
    [cards, filters]
  );

  return {
    filters,
    setRarity,
    setPosition,
    setLeague,
    setSortBy,
    setInSeasonOnly,
    leagues,
    filteredCards,
  };
}
