"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAllUserCards,
  fetchUserCardsWithPlayers,
  mapKvCardToUnifiedCard,
  syncCardsToKv,
} from "@/lib/kv-api";
import type { UnifiedCard } from "@/lib/kv-types";
import { UserIdError } from "@/lib/kv-types";
import { fetchAllCards } from "@/lib/sorare-api";
import { getCurrentUserId, getCurrentUserIdSafe } from "@/lib/user-id";

// ============================================================================
// Types
// ============================================================================

interface KvCardsState {
  cards: UnifiedCard[];
  userId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isSyncing: boolean;
  error: string;
  loadingProgress: string;
  lastUpdate: Date | null;
}

interface UseKvCardsReturn extends KvCardsState {
  refresh: () => void;
  syncWithSorare: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useKvCards(): UseKvCardsReturn {
  const [state, setState] = useState<KvCardsState>({
    cards: [],
    userId: "",
    isLoading: true,
    isRefreshing: false,
    isSyncing: false,
    error: "",
    loadingProgress: "",
    lastUpdate: null,
  });

  // Carica le carte dal KV
  const loadCards = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
      loadingProgress: "Caricamento carte...",
    }));

    try {
      const userId = getCurrentUserId();

      const response = await fetchUserCardsWithPlayers(userId);

      // Mappa le carte
      const cards = response.cards
        .map((kvCard, index) => {
          try {
            return mapKvCardToUnifiedCard(kvCard);
          } catch (mapErr) {
            console.error(`[useKvCards] Error mapping card ${index}:`, mapErr);
            return null;
          }
        })
        .filter((c): c is UnifiedCard => c !== null);

      setState((prev) => ({
        ...prev,
        cards,
        userId,
        isLoading: false,
        loadingProgress: "",
        lastUpdate: new Date(),
      }));
    } catch (err) {
      let errorMessage: string;
      if (err instanceof UserIdError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Errore nel caricamento delle carte";
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        loadingProgress: "",
      }));
    }
  }, []);

  // Effetto iniziale
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Refresh: ricarica dal KV
  const refresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRefreshing: true,
      error: "",
    }));

    loadCards().finally(() => {
      setState((prev) => ({
        ...prev,
        isRefreshing: false,
      }));
    });
  }, [loadCards]);

  // Sync: scarica da Sorare e salva su KV
  const syncWithSorare = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isSyncing: true,
      isRefreshing: true,
      error: "",
      loadingProgress: "Connessione a Sorare...",
    }));

    try {
      const userId = getCurrentUserId();

      // 1. Scarica da Sorare
      setState((prev) => ({
        ...prev,
        loadingProgress: "Scaricamento carte da Sorare...",
      }));

      const sorareResult = await fetchAllCards({
        onProgress: (page, total) => {
          setState((prev) => ({
            ...prev,
            loadingProgress: `Pagina ${page}... (${total} carte)`,
          }));
        },
      });

      // 2. Salva su KV
      setState((prev) => ({
        ...prev,
        loadingProgress: `Sincronizzazione ${sorareResult.cards.length} carte...`,
      }));

      await syncCardsToKv(userId, sorareResult.cards, (saved, total) => {
        setState((prev) => ({
          ...prev,
          loadingProgress: `Salvate ${saved}/${total} carte...`,
        }));
      });

      // 3. Ricarica dal KV
      setState((prev) => ({
        ...prev,
        loadingProgress: "Aggiornamento dati...",
      }));

      const cards = await fetchAllUserCards(userId);

      setState((prev) => ({
        ...prev,
        cards,
        userId,
        isSyncing: false,
        isRefreshing: false,
        loadingProgress: "",
        lastUpdate: new Date(),
      }));
    } catch (err) {
      let errorMessage: string;
      if (err instanceof UserIdError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "Errore nella sincronizzazione";
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isSyncing: false,
        isRefreshing: false,
        loadingProgress: "",
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, []);

  return {
    ...state,
    refresh,
    syncWithSorare,
    clearError,
  };
}

// ============================================================================
// Utility Hook per controllare se l'utente è autenticato
// ============================================================================

export function useAuthStatus(): {
  isAuthenticated: boolean;
  userId: string | null;
  isLoading: boolean;
} {
  const [status, setStatus] = useState<{
    isAuthenticated: boolean;
    userId: string | null;
    isLoading: boolean;
  }>({
    isAuthenticated: false,
    userId: null,
    isLoading: true,
  });

  useEffect(() => {
    const userId = getCurrentUserIdSafe();
    setStatus({
      isAuthenticated: userId !== null,
      userId,
      isLoading: false,
    });
  }, []);

  return status;
}
