"use client";

import { useMemo } from "react";
import type { StellarFlatCard } from "@/lib/stellar/types";
import type { StellarSlotPosition } from "./stellar-pitch-field";
import { STELLAR_POSITION_MAPPING } from "./stellar-pitch-field";

interface UseStellarFilteredCardsOptions {
  cards: StellarFlatCard[];
  usedCardSlugs: Set<string>;
  usedPlayerNames: Set<string>;
  activeSlot: StellarSlotPosition | null;
  searchQuery: string;
  sortBy: "name" | "team" | "l10" | "projected";
  homeOnly: boolean;
  starterOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
}

export function useStellarFilteredCards(
  options: UseStellarFilteredCardsOptions
): StellarFlatCard[] {
  const {
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
  } = options;

  return useMemo(() => {
    let filtered = cards.filter((card) => {
      // Escludi carte già usate nella lineup
      if (usedCardSlugs.has(card.slug)) {
        return false;
      }
      // Escludi stesso giocatore già nella lineup
      if (usedPlayerNames.has(card.playerName)) {
        return false;
      }
      return true;
    });

    // Filtra per posizione se c'è uno slot attivo
    if (activeSlot) {
      const allowed = STELLAR_POSITION_MAPPING[activeSlot];
      filtered = filtered.filter((card) =>
        card.positions.some((pos) => allowed.includes(pos))
      );
    }

    // Filtra per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.playerName.toLowerCase().includes(query) ||
          (card.clubName?.toLowerCase().includes(query) ?? false)
      );
    }

    // Filtra giocatori in casa
    if (homeOnly) {
      filtered = filtered.filter((card) =>
        card.nextGameOpponent?.startsWith("vs")
      );
    }

    // Filtra titolari (starterOdds >= 50%)
    if (starterOnly) {
      filtered = filtered.filter(
        (card) => card.starterOdds != null && card.starterOdds >= 50
      );
    }

    // Filtra per range date partita
    if (dateFrom) {
      filtered = filtered.filter((card) => {
        if (!card.nextGameDate) {
          return false;
        }
        const day = card.nextGameDate.slice(0, 10);
        if (day < dateFrom) {
          return false;
        }
        if (dateTo && day > dateTo) {
          return false;
        }
        return true;
      });
    }

    // Ordina
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.playerName.localeCompare(b.playerName);
        case "team":
          return (a.clubName ?? "").localeCompare(b.clubName ?? "");
        case "l10":
          return (b.l10Average ?? 0) - (a.l10Average ?? 0);
        case "projected":
          return (b.projectedScore ?? 0) - (a.projectedScore ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
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
  ]);
}
