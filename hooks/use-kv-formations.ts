"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode } from "@/lib/db";
import { KV_WORKER_URL } from "@/lib/kv-api";
import type { CardData } from "@/lib/sorare-api";
import { getCurrentUserId } from "@/lib/user-id";

// Formation data structure from KV API
export interface KVFormation {
  id: string; // timestamp
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  data: {
    name: string;
    formation: string;
    league: string;
    cards: CardData[];
    slots: Array<{ position: string; cardSlug: string }>;
    gameMode: GameMode;
  };
}

// Client-side formation type (compatible with existing SavedFormation)
export interface SavedFormation {
  id: string; // KV uses string timestamps
  name: string;
  league: string;
  cards: CardData[];
  slots: Array<{ position: string; cardSlug: string }>;
  gameMode: GameMode;
  createdAt: number; // timestamp for sorting
}

interface UseKVFormationsReturn {
  formations: SavedFormation[];
  isLoading: boolean;
  error: string | null;
  loadFormations: () => Promise<void>;
  saveFormation: (
    formation: Omit<SavedFormation, "id" | "createdAt">
  ) => Promise<string>;
  updateFormation: (
    id: string,
    formation: Partial<SavedFormation>
  ) => Promise<void>;
  deleteFormation: (id: string) => Promise<void>;
  deleteAllFormations: () => Promise<void>;
  getFormation: (id: string) => Promise<SavedFormation | null>;
}

// Global state for deduplication
const globalState = {
  formations: [] as SavedFormation[],
  isLoading: false,
  lastFetchTime: 0,
  fetchPromise: null as Promise<void> | null,
};

const DEDUP_MS = 2000; // Minimum time between fetches

// Convert KV formation to client formation
function convertKVToSavedFormation(kvFormation: KVFormation): SavedFormation {
  return {
    id: kvFormation.id,
    name: kvFormation.data.name,
    league: kvFormation.data.league,
    cards: kvFormation.data.cards,
    slots: kvFormation.data.slots,
    gameMode: kvFormation.data.gameMode,
    createdAt: new Date(kvFormation.createdAt).getTime(),
  };
}

export function useKVFormations(): UseKVFormationsReturn {
  const [formations, setFormations] = useState<SavedFormation[]>(
    globalState.formations
  );
  const [isLoading, setIsLoading] = useState(globalState.isLoading);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const getUserId = useCallback((): string | null => {
    try {
      return getCurrentUserId();
    } catch {
      return null;
    }
  }, []);

  const loadFormations = useCallback(async () => {
    const userId = getUserId();
    if (!userId) {
      setError("Utente non autenticato");
      setIsLoading(false);
      return;
    }

    // Check if we should deduplicate
    const now = Date.now();
    const timeSinceLastFetch = now - globalState.lastFetchTime;

    if (timeSinceLastFetch < DEDUP_MS && globalState.formations.length > 0) {
      // Use cached data
      setFormations(globalState.formations);
      setIsLoading(false);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (globalState.fetchPromise) {
      await globalState.fetchPromise;
      setFormations(globalState.formations);
      return;
    }

    setIsLoading(true);
    globalState.isLoading = true;
    setError(null);

    // Create the fetch promise
    const fetchPromise = (async () => {
      try {
        const response = await fetch(
          `${KV_WORKER_URL}/api/formations?userId=${encodeURIComponent(userId)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = (await response.json()) as {
          userId: string;
          count: number;
          formations: KVFormation[];
        };

        const convertedFormations = (result.formations || [])
          .map(convertKVToSavedFormation)
          .sort((a, b) => {
            // Sort by league first, then by createdAt (oldest first)
            if (a.league !== b.league) {
              return a.league.localeCompare(b.league);
            }
            return a.createdAt - b.createdAt;
          });

        globalState.formations = convertedFormations;
        globalState.lastFetchTime = Date.now();
        setFormations(convertedFormations);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Errore sconosciuto";
        setError(message);
        console.error("Error loading formations:", err);
      } finally {
        setIsLoading(false);
        globalState.isLoading = false;
        globalState.fetchPromise = null;
      }
    })();

    globalState.fetchPromise = fetchPromise;
    await fetchPromise;
  }, [getUserId]);

  const saveFormation = useCallback(
    async (
      formation: Omit<SavedFormation, "id" | "createdAt">
    ): Promise<string> => {
      const userId = getUserId();
      if (!userId) {
        throw new Error("Utente non autenticato");
      }

      const response = await fetch(`${KV_WORKER_URL}/api/formations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          data: {
            name: formation.name,
            formation: formation.gameMode, // API expects formation field
            league: formation.league,
            players: formation.cards, // API expects players field
            cards: formation.cards, // Keep both for compatibility
            slots: formation.slots,
            gameMode: formation.gameMode,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        formation?: KVFormation;
        error?: string;
      };

      if (!(result.success && result.formation)) {
        throw new Error(result.error || "Errore nel salvataggio");
      }

      // Update global and local state
      const newFormation = convertKVToSavedFormation(result.formation);
      globalState.formations = [...globalState.formations, newFormation].sort(
        (a, b) => {
          if (a.league !== b.league) {
            return a.league.localeCompare(b.league);
          }
          return a.createdAt - b.createdAt;
        }
      );
      setFormations(globalState.formations);

      return result.formation.id;
    },
    [getUserId]
  );

  const updateFormation = useCallback(
    async (id: string, formation: Partial<SavedFormation>): Promise<void> => {
      const userId = getUserId();
      if (!userId) {
        throw new Error("Utente non autenticato");
      }

      // Get existing formation to merge
      const existing = globalState.formations.find((f) => f.id === id);
      if (!existing) {
        throw new Error("Formazione non trovata");
      }

      const response = await fetch(`${KV_WORKER_URL}/api/formations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          data: {
            name: formation.name ?? existing.name,
            formation: formation.gameMode ?? existing.gameMode,
            league: formation.league ?? existing.league,
            players: formation.cards ?? existing.cards,
            cards: formation.cards ?? existing.cards,
            slots: formation.slots ?? existing.slots,
            gameMode: formation.gameMode ?? existing.gameMode,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        formation?: KVFormation;
        error?: string;
      };

      if (!(result.success && result.formation)) {
        throw new Error(result.error || "Errore nell'aggiornamento");
      }

      // Update global and local state
      const updatedFormation = convertKVToSavedFormation(result.formation);
      globalState.formations = globalState.formations
        .map((f) => (f.id === id ? updatedFormation : f))
        .sort((a, b) => {
          if (a.league !== b.league) {
            return a.league.localeCompare(b.league);
          }
          return a.createdAt - b.createdAt;
        });
      setFormations(globalState.formations);
    },
    [getUserId]
  );

  const deleteFormation = useCallback(
    async (id: string): Promise<void> => {
      const userId = getUserId();
      if (!userId) {
        throw new Error("Utente non autenticato");
      }

      const response = await fetch(
        `${KV_WORKER_URL}/api/formations/${id}?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || "Errore nella cancellazione");
      }

      // Update global and local state
      globalState.formations = globalState.formations.filter(
        (f) => f.id !== id
      );
      setFormations(globalState.formations);
    },
    [getUserId]
  );

  const deleteAllFormations = useCallback(async (): Promise<void> => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("Utente non autenticato");
    }

    // Delete all formations one by one (API doesn't have bulk delete)
    const deletePromises = globalState.formations.map((f) =>
      deleteFormation(f.id)
    );
    await Promise.all(deletePromises);
  }, [deleteFormation, getUserId]);

  const getFormation = useCallback(
    async (id: string): Promise<SavedFormation | null> => {
      // First check global/local state
      const local = globalState.formations.find((f) => f.id === id);
      if (local) {
        return local;
      }

      // Otherwise reload from server
      await loadFormations();
      return globalState.formations.find((f) => f.id === id) ?? null;
    },
    [loadFormations]
  );

  // Load formations on mount (only once)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadFormations();
    }
  }, [loadFormations]);

  return {
    formations,
    isLoading,
    error,
    loadFormations,
    saveFormation,
    updateFormation,
    deleteFormation,
    deleteAllFormations,
    getFormation,
  };
}
