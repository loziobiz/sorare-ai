"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshUserCardsFromWorker } from "@/lib/auth-server";
import {
  fetchAllUserCards,
  fetchSyncStatus,
  fetchUserCardsWithPlayers,
  mapKvCardToUnifiedCard,
} from "@/lib/kv-api";
import type { SyncStatusResponse, UnifiedCard } from "@/lib/kv-types";
import { UserIdError } from "@/lib/kv-types";
import { getCurrentUserId, getCurrentUserIdSafe } from "@/lib/user-id";

// ============================================================================
// Helpers
// ============================================================================

function getSyncErrorMessage(err: unknown): string {
  if (err instanceof UserIdError) return err.message;
  if (err instanceof Error) return err.message;
  return "Errore nella sincronizzazione";
}

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
  syncStatus: SyncStatusResponse | null;
}

interface UseKvCardsReturn extends KvCardsState {
  refresh: (options?: { skipCache?: boolean }) => void;
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
    syncStatus: null,
  });

  // Carica le carte dal KV
  const loadCards = useCallback(async (options?: { skipCache?: boolean }) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: "",
      loadingProgress: "Caricamento carte...",
    }));

    try {
      const userId = getCurrentUserId();

      const response = await fetchUserCardsWithPlayers(userId, {
        skipCache: options?.skipCache,
      });

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

      const [syncStatusRes] = await Promise.allSettled([
        fetchSyncStatus(userId),
      ]);
      const syncStatus =
        syncStatusRes.status === "fulfilled" ? syncStatusRes.value : null;

      setState((prev) => ({
        ...prev,
        cards,
        userId,
        isLoading: false,
        loadingProgress: "",
        lastUpdate: new Date(),
        syncStatus: syncStatus && !("error" in syncStatus) ? syncStatus : null,
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
  const refresh = useCallback(
    (options?: { skipCache?: boolean }) => {
      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        error: "",
      }));

      loadCards(options).finally(() => {
        setState((prev) => ({
          ...prev,
          isRefreshing: false,
        }));
      });
    },
    [loadCards]
  );

  // Sync: richiede al worker di scaricare le carte da Sorare e salvarle su KV
  const syncWithSorare = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isSyncing: true,
      isRefreshing: true,
      error: "",
      loadingProgress: "Connessione al worker...",
    }));

    try {
      const userId = getCurrentUserId();

      setState((prev) => ({
        ...prev,
        loadingProgress: "Aggiornamento carte...",
      }));

      const result = await refreshUserCardsFromWorker({ data: { userId } });

      if (!result.success) {
        const msg =
          result.error?.toLowerCase().includes("expired") ||
          result.error?.toLowerCase().includes("invalid")
            ? "Token scaduto, rieffettua il login"
            : (result.error ?? "Errore nella sincronizzazione");
        throw new Error(msg);
      }

      setState((prev) => ({
        ...prev,
        loadingProgress: "Caricamento dati aggiornati...",
      }));

      const cards = await fetchAllUserCards(userId, {
        skipCache: true,
      });

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
      setState((prev) => ({
        ...prev,
        error: getSyncErrorMessage(err),
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
