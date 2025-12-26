"use client";

import { LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CardsGrid } from "@/components/cards/card-grid";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCacheCleanup } from "@/hooks/use-indexed-db";
import { logout } from "@/lib/auth";
import { DEFAULT_TTL, db } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";
import { clearAllCaches, fetchAllCards } from "@/lib/sorare-api";

type RarityFilter = "all" | "limited" | "rare";

function formatLastUpdate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}

function filterCardsByRarity(cards: CardData[], rarityFilter: RarityFilter) {
  return cards.filter((card) => {
    if (rarityFilter === "all") {
      return true;
    }
    return card.rarityTyped.toLowerCase() === rarityFilter;
  });
}

const ENABLE_PAGINATION = true; // Imposta a true per abilitare il caricamento completo

export function CardsDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [userSlug, setUserSlug] = useState("");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [loadingProgress, setLoadingProgress] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useCacheCleanup();

  const loadCardsFromDb = useCallback(async (): Promise<boolean> => {
    try {
      const cached = await db.cache.get("user_cards");

      if (!cached) {
        return false;
      }

      const { timestamp, value, ttl } = cached;
      const cacheAge = Date.now() - timestamp;

      if (ttl && cacheAge > ttl) {
        await db.cache.delete("user_cards");
        return false;
      }

      const data = value as { cards: CardData[]; userSlug: string };
      setCards(data.cards);
      setUserSlug(data.userSlug);
      setLastUpdate(new Date(timestamp));
      setIsLoading(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const saveCardsToDb = useCallback(
    async (cardsData: CardData[], currentUserSlug: string) => {
      await db.cache.put({
        key: "user_cards",
        value: { cards: cardsData, userSlug: currentUserSlug },
        timestamp: Date.now(),
        ttl: DEFAULT_TTL.LONG,
      });
    },
    []
  );

  const fetchCards = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      setLoadingProgress("Fetching cards...");

      try {
        const result = await fetchAllCards({
          cacheTtl: isRefresh ? 0 : undefined, // Bypassa cache durante refresh
          enablePagination: ENABLE_PAGINATION,
          onProgress: (page, total) => {
            setLoadingProgress(`Fetching page ${page}... (${total} cards)`);
          },
        });

        setCards(result.cards);
        setUserSlug(result.userSlug);
        setLastUpdate(new Date());
        await saveCardsToDb(result.cards, result.userSlug);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch cards");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setLoadingProgress("");
      }
    },
    [saveCardsToDb]
  );

  const loadCards = useCallback(async () => {
    const found = await loadCardsFromDb();
    if (!found) {
      await fetchCards(false);
    }
  }, [loadCardsFromDb, fetchCards]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleRefresh = () => {
    fetchCards(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleClearCache = async () => {
    await clearAllCaches();
    // Reload cards after clearing cache
    await fetchCards(false);
  };

  const displayCards = filterCardsByRarity(cards, rarityFilter);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner icon="loader" message={loadingProgress} />
      </div>
    );
  }

  if (isRefreshing) {
    return (
      <div className="space-y-6">
        <LoadingSpinner icon="refresh" message={loadingProgress} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Sorare AI Dashboard</h1>
          <p className="text-muted-foreground">
            {userSlug && `Benvenuto, ${userSlug}`}
            {lastUpdate && (
              <span className="ml-2 text-sm">
                · Updated {formatLastUpdate(lastUpdate)}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={isRefreshing || isLoading}
            onClick={handleRefresh}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Aggiorna carte
          </Button>
          <Button
            disabled={isRefreshing || isLoading}
            onClick={handleClearCache}
            variant="outline"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Pulisci cache
          </Button>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => setRarityFilter("all")}
          variant={rarityFilter === "all" ? "default" : "outline"}
        >
          Tutte
        </Button>
        <Button
          onClick={() => setRarityFilter("limited")}
          variant={rarityFilter === "limited" ? "default" : "outline"}
        >
          Limited
        </Button>
        <Button
          onClick={() => setRarityFilter("rare")}
          variant={rarityFilter === "rare" ? "default" : "outline"}
        >
          Rare
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Cards Grid */}
      <div className="space-y-4">
        <h2 className="font-bold text-2xl">
          Your Cards ({displayCards.length})
        </h2>
        <CardsGrid
          cards={displayCards}
          columns={{ lg: 5, md: 4, mobile: 1 }}
          emptyMessage={`No ${rarityFilter === "all" ? "limited or rare" : rarityFilter} cards found in your collection`}
          showCardAverages
          showCardPositions={false}
        />
      </div>
    </div>
  );
}
