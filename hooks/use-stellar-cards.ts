"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearStellarCache,
  fetchCardSetsAndUser,
  fetchStellarCards,
  getCachedStellarCards,
} from "@/lib/stellar/api";
import type { StellarCacheData, StellarFlatCard } from "@/lib/stellar/types";

interface StellarCardsState {
  cards: StellarFlatCard[];
  cardSetName: string | null;
  totalCollections: number;
  completeCollections: number;
  isLoading: boolean;
  isDownloading: boolean;
  error: string;
  progress: string;
  lastUpdate: Date | null;
}

interface UseStellarCardsReturn extends StellarCardsState {
  download: () => Promise<void>;
  clearCache: () => Promise<void>;
}

function applyCache(data: StellarCacheData): Partial<StellarCardsState> {
  return {
    cards: data.cards,
    cardSetName: data.cardSetName,
    totalCollections: data.totalCollections,
    completeCollections: data.completeCollections,
    lastUpdate: new Date(data.downloadedAt),
  };
}

export function useStellarCards(): UseStellarCardsReturn {
  const [state, setState] = useState<StellarCardsState>({
    cards: [],
    cardSetName: null,
    totalCollections: 0,
    completeCollections: 0,
    isLoading: true,
    isDownloading: false,
    error: "",
    progress: "",
    lastUpdate: null,
  });

  // Load from cache on mount
  useEffect(() => {
    getCachedStellarCards()
      .then((cached) => {
        if (cached) {
          setState((prev) => ({
            ...prev,
            ...applyCache(cached),
            isLoading: false,
          }));
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      })
      .catch(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      });
  }, []);

  const download = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isDownloading: true,
      error: "",
      progress: "Recupero card sets attivi...",
    }));

    try {
      const { userSlug, cardSets } = await fetchCardSetsAndUser();

      if (cardSets.length === 0) {
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          error: "Nessun card set attivo trovato",
          progress: "",
        }));
        return;
      }

      const activeSet = cardSets[0];

      setState((prev) => ({
        ...prev,
        progress: `Download collezioni ${activeSet.name}...`,
      }));

      const data = await fetchStellarCards(
        activeSet.slug,
        userSlug,
        (step, current, total) => {
          const msg = total > 0 ? `${step} (${current}/${total})` : step;
          setState((prev) => ({
            ...prev,
            progress: msg,
          }));
        }
      );

      setState((prev) => ({
        ...prev,
        ...applyCache({ ...data, cardSetName: activeSet.name }),
        isDownloading: false,
        progress: "",
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Errore nel download";
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        error: message,
        progress: "",
      }));
    }
  }, []);

  const clearCacheFn = useCallback(async () => {
    await clearStellarCache();
    setState((prev) => ({
      ...prev,
      cards: [],
      cardSetName: null,
      totalCollections: 0,
      completeCollections: 0,
      lastUpdate: null,
    }));
  }, []);

  return {
    ...state,
    download,
    clearCache: clearCacheFn,
  };
}
