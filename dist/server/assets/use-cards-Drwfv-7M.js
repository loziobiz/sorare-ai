import { useState, useCallback, useEffect } from "react";
import { u as useCacheCleanup, f as fetchAllCards, E as ENABLE_PAGINATION, c as clearAllCaches, d as db, D as DEFAULT_TTL } from "./sorare-api-CM3Hu48J.js";
const CACHE_KEY = "user_cards";
async function loadCardsFromDb() {
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
    const data = value;
    return { ...data, timestamp };
  } catch {
    return null;
  }
}
async function saveCardsToDb(cards, userSlug) {
  await db.cache.put({
    key: CACHE_KEY,
    value: { cards, userSlug },
    timestamp: Date.now(),
    ttl: DEFAULT_TTL.LONG
  });
}
function useCards() {
  const [state, setState] = useState({
    cards: [],
    userSlug: "",
    isLoading: true,
    isRefreshing: false,
    error: "",
    loadingProgress: "",
    lastUpdate: null
  });
  useCacheCleanup();
  const fetchCards = useCallback(async (isRefresh = false) => {
    setState((prev) => ({
      ...prev,
      isLoading: !isRefresh,
      isRefreshing: isRefresh,
      error: "",
      loadingProgress: "Fetching cards..."
    }));
    try {
      const result = await fetchAllCards({
        cacheTtl: isRefresh ? 0 : void 0,
        enablePagination: ENABLE_PAGINATION,
        onProgress: (page, total) => {
          setState((prev) => ({
            ...prev,
            loadingProgress: `Fetching page ${page}... (${total} cards)`
          }));
        }
      });
      await saveCardsToDb(result.cards, result.userSlug);
      setState((prev) => ({
        ...prev,
        cards: result.cards,
        userSlug: result.userSlug,
        lastUpdate: /* @__PURE__ */ new Date(),
        isLoading: false,
        isRefreshing: false,
        loadingProgress: ""
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to fetch cards",
        isLoading: false,
        isRefreshing: false,
        loadingProgress: ""
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
        isLoading: false
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
    clearCache
  };
}
export {
  useCards as u
};
