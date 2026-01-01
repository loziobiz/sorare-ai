"use client";

import { useCallback, useEffect, useState } from "react";
import { useCacheCleanup } from "@/hooks/use-indexed-db";
import { ENABLE_PAGINATION } from "@/lib/config";
import { DEFAULT_TTL, db } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";
import { clearAllCaches, fetchAllCards } from "@/lib/sorare-api";

interface CardsState {
  cards: CardData[];
  userSlug: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string;
  loadingProgress: string;
  lastUpdate: Date | null;
}

interface UseCardsReturn extends CardsState {
  refresh: () => void;
  clearCache: () => Promise<void>;
}

const CACHE_KEY = "user_cards";

async function loadCardsFromDb(): Promise<{
  cards: CardData[];
  userSlug: string;
  timestamp: number;
} | null> {
  try {
    const cached = await db.cache.get(CACHE_KEY);

    if (!cached) {
      return null;
    }

    const { timestamp, value, ttl } = cached;
    const cacheAge = Date.now() - timestamp;

    if (ttl && cacheAge > ttl) {
      await db.cache.delete(CACHE_KEY);
      return null;
    }

    const data = value as { cards: CardData[]; userSlug: string };
    return { ...data, timestamp };
  } catch {
    return null;
  }
}

async function saveCardsToDb(
  cards: CardData[],
  userSlug: string
): Promise<void> {
  await db.cache.put({
    key: CACHE_KEY,
    value: { cards, userSlug },
    timestamp: Date.now(),
    ttl: DEFAULT_TTL.LONG,
  });
}

export function useCards(): UseCardsReturn {
  const [state, setState] = useState<CardsState>({
    cards: [],
    userSlug: "",
    isLoading: true,
    isRefreshing: false,
    error: "",
    loadingProgress: "",
    lastUpdate: null,
  });

  useCacheCleanup();

  const fetchCards = useCallback(async (isRefresh = false) => {
    setState((prev) => ({
      ...prev,
      isLoading: !isRefresh,
      isRefreshing: isRefresh,
      error: "",
      loadingProgress: "Fetching cards...",
    }));

    try {
      const result = await fetchAllCards({
        cacheTtl: isRefresh ? 0 : undefined,
        enablePagination: ENABLE_PAGINATION,
        onProgress: (page, total) => {
          setState((prev) => ({
            ...prev,
            loadingProgress: `Fetching page ${page}... (${total} cards)`,
          }));
        },
      });

      await saveCardsToDb(result.cards, result.userSlug);

      setState((prev) => ({
        ...prev,
        cards: result.cards,
        userSlug: result.userSlug,
        lastUpdate: new Date(),
        isLoading: false,
        isRefreshing: false,
        loadingProgress: "",
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to fetch cards",
        isLoading: false,
        isRefreshing: false,
        loadingProgress: "",
      }));
    }
  }, []);

  const loadCards = useCallback(async () => {
    const cached = await loadCardsFromDb();

    if (cached) {
      setState((prev) => ({
        ...prev,
        cards: cached.cards,
        userSlug: cached.userSlug,
        lastUpdate: new Date(cached.timestamp),
        isLoading: false,
      }));
      return;
    }

    await fetchCards(false);
  }, [fetchCards]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const refresh = useCallback(() => {
    fetchCards(true);
  }, [fetchCards]);

  const clearCache = useCallback(async () => {
    await clearAllCaches();
    await fetchCards(false);
  }, [fetchCards]);

  return {
    ...state,
    refresh,
    clearCache,
  };
}
