"use client";

import { LogOut, RefreshCw, Trophy, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CardsGrid } from "@/components/cards/card-grid";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/lib/auth";
import type { CardData } from "@/lib/sorare-api";
import { fetchAllCards } from "@/lib/sorare-api";

type RarityFilter = "all" | "limited" | "rare";

interface CachedData {
  cards: CardData[];
  userSlug: string;
  timestamp: number;
}

const CACHE_KEY = "sorare_cards_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore
const ENABLE_PAGINATION = true; // Imposta a true per abilitare il caricamento completo

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
  return cards
    .filter((card) => {
      const rarity = card.rarityTyped.toLowerCase();
      return rarity === "limited" || rarity === "rare";
    })
    .filter((card) => {
      if (rarityFilter === "all") {
        return true;
      }
      return card.rarityTyped.toLowerCase() === rarityFilter;
    });
}

function getRarityCount(cards: CardData[], rarity: string): number {
  return cards.filter((c) => c.rarityTyped.toLowerCase() === rarity).length;
}

function saveCardsToCache(cards: CardData[], currentUserSlug: string): void {
  const cacheData: CachedData = {
    cards,
    userSlug: currentUserSlug || cards[0]?.slug || "",
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

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

  const fetchCards = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError("");
    setLoadingProgress("Fetching cards...");

    try {
      const result = await fetchAllCards({
        enablePagination: ENABLE_PAGINATION,
        onProgress: (page, total) => {
          setLoadingProgress(`Fetching page ${page}... (${total} cards)`);
        },
      });

      setCards(result.cards);
      setUserSlug(result.userSlug);
      setLastUpdate(new Date());
      saveCardsToCache(result.cards, result.userSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cards");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLoadingProgress("");
    }
  }, []);

  const loadCards = useCallback(async () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const data: CachedData = JSON.parse(cached);
        const cacheAge = Date.now() - data.timestamp;

        if (cacheAge < CACHE_DURATION) {
          setCards(data.cards);
          setUserSlug(data.userSlug);
          setLastUpdate(new Date(data.timestamp));
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall through to fetch
      }
    }

    await fetchCards(false);
  }, [fetchCards]);

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
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Cards</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{displayCards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Limited</CardTitle>
            <Trophy className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {getRarityCount(cards, "limited")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Rare</CardTitle>
            <Trophy className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {getRarityCount(cards, "rare")}
            </div>
          </CardContent>
        </Card>
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
          showCardPositions
        />
      </div>
    </div>
  );
}
