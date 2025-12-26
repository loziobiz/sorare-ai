import { useCallback, useEffect, useState } from "react";
import type { CachedCards } from "@/lib/db";
import {
  cleanupExpiredCache,
  db,
  getCache,
  invalidateCache,
  setCache,
} from "@/lib/db";

export function useCache<T>(
  key: string,
  ttl = 24 * 60 * 60 * 1000
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  setCache: (value: T) => Promise<void>;
  invalidate: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cached = await getCache<T>(key);
      setData(cached);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load cache"));
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const saveCache = useCallback(
    async (value: T) => {
      await setCache(key, value, ttl);
      setData(value);
    },
    [key, ttl]
  );

  const invalidate = useCallback(async () => {
    await invalidateCache(key);
    setData(null);
  }, [key]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    setCache: saveCache,
    invalidate,
  };
}

export function useCardsCache(userSlug: string): {
  cards: CachedCards | null;
  isLoading: boolean;
  error: Error | null;
  saveCards: (cards: CachedCards["cards"]) => Promise<void>;
  invalidate: () => Promise<void>;
} {
  const [data, setData] = useState<CachedCards | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const key = `user_cards_${userSlug}`;

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cached = await db.cachedCards.get(key);
      setData(cached ?? null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load cards"));
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const saveCards = useCallback(
    async (cardsData: CachedCards["cards"]) => {
      const entry: CachedCards = {
        slug: key,
        userSlug,
        cards: cardsData,
        timestamp: Date.now(),
      };

      await db.cachedCards.put(entry);
      setData(entry);
    },
    [key, userSlug]
  );

  const invalidate = useCallback(async () => {
    await db.cachedCards.delete(key);
    setData(null);
  }, [key]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  return {
    cards: data,
    isLoading,
    error,
    saveCards,
    invalidate,
  };
}

export function useCacheCleanup(
  intervalMs = 60 * 60 * 1000 // 1 ora
): boolean {
  const [isCleaned, setIsCleaned] = useState(false);

  useEffect(() => {
    const cleanup = async () => {
      await cleanupExpiredCache();
      setIsCleaned(true);
    };

    cleanup();

    const interval = setInterval(cleanup, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return isCleaned;
}
