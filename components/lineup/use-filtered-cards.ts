"use client";

import { useMemo } from "react";
import type { CardData } from "@/lib/sorare-api";
import type { SlotPosition } from "./lineup-builder";

interface UseFilteredCardsOptions {
  cards: CardData[];
  usedCardSlugs: Set<string | undefined>;
  leagueFilter: string;
  rarityFilter: "all" | "limited" | "rare";
  activeSlot: SlotPosition | null;
  searchQuery: string;
  sortBy: "name" | "team" | "l5" | "l10" | "l15" | "l40";
  inSeasonOnly: boolean;
  homeOnly: boolean;
  starterOnly: boolean;
  l10MaxFilter: number | null;

  cap: number | null;
  positionMapping: Record<SlotPosition, string[]>;
  savedFormationsCards: Map<string, string>; // slug -> formationName
  showUsedCards: boolean;
}

export function useFilteredCards(options: UseFilteredCardsOptions): CardData[] {
  const {
    cards,
    usedCardSlugs,
    leagueFilter,
    rarityFilter,
    activeSlot,
    searchQuery,
    sortBy,
    inSeasonOnly,
    homeOnly,
    starterOnly,
    l10MaxFilter,

    cap,
    positionMapping,
    savedFormationsCards,
    showUsedCards,
  } = options;

  return useMemo(() => {
    let filtered = cards.filter((card) => !usedCardSlugs.has(card.slug));

    // Esclude giocatori senza squadra
    filtered = filtered.filter((card) =>
      Boolean(card.anyPlayer?.activeClub?.name?.trim())
    );

    // Filtra le carte in cassaforte (mostra solo carte libere)
    filtered = filtered.filter((card) => card.sealed !== true);

    // Filtra per lega se selezionata
    if (leagueFilter) {
      const pipeIndex = leagueFilter.indexOf("|");
      const hasCountryCode = pipeIndex !== -1;
      const leagueName = hasCountryCode
        ? leagueFilter.slice(0, pipeIndex)
        : leagueFilter;
      const countryCode = hasCountryCode
        ? leagueFilter.slice(pipeIndex + 1)
        : null;

      filtered = filtered.filter((card) =>
        card.anyPlayer?.activeClub?.activeCompetitions?.some(
          (c) =>
            c.format === "DOMESTIC_LEAGUE" &&
            c.name === leagueName &&
            (countryCode === null || c.country?.code === countryCode)
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
      const allowedPositions = positionMapping[activeSlot];
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

    // Filtra per giocatori che giocano in casa
    if (homeOnly) {
      filtered = filtered.filter((card) => {
        const clubName = card.anyPlayer?.activeClub?.name;
        const homeTeamName = card.anyPlayer?.nextGame?.homeTeam?.name;
        return Boolean(clubName && homeTeamName && clubName === homeTeamName);
      });
    }

    // Filtra per giocatori con alta probabilità di essere titolari (>= 70%)
    if (starterOnly) {
      filtered = filtered.filter((card) => {
        const starterOdds =
          card.anyPlayer?.nextClassicFixturePlayingStatusOdds
            ?.starterOddsBasisPoints;
        return Boolean(starterOdds && starterOdds >= 7000);
      });
    }

    // Filtra per L10 massimo
    if (l10MaxFilter !== null) {
      filtered = filtered.filter((card) => {
        const l10 = card.l10Average ?? 0;
        return l10 <= l10MaxFilter;
      });
    }

    // Filtra giocatori già utilizzati in altre formazioni salvate
    if (!showUsedCards) {
      filtered = filtered.filter(
        (card) => !savedFormationsCards.has(card.slug)
      );
    }

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
    homeOnly,
    starterOnly,
    l10MaxFilter,
    cap,
    positionMapping,
    savedFormationsCards,
    showUsedCards,
  ]);
}
