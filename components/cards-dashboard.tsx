"use client";

import { Loader2, LogOut, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logout } from "@/lib/auth";

type RarityFilter = "all" | "limited" | "rare";

interface CardData {
  slug: string;
  name: string;
  rarityTyped: string;
  anyPositions?: string[];
  pictureUrl?: string;
  l5Average?: number;
  l10Average?: number;
  l15Average?: number;
  l40Average?: number;
}

interface CachedData {
  cards: CardData[];
  userSlug: string;
  timestamp: number;
}

const CACHE_KEY = "sorare_cards_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore
const ENABLE_PAGINATION = true; // Imposta a true per abilitare il caricamento completo
const GRAPHQL_QUERY = `
  query GetCards($after: String) {
    currentUser {
      slug
      cards(first: 100, after: $after) {
        nodes {
          slug
          name
          rarityTyped
          anyPositions
          pictureUrl
          l5Average: averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)
          l10Average: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
          l15Average: averageScore(type: LAST_FIFTEEN_SO5_AVERAGE_SCORE)
          l40Average: averageScore(type: LAST_FORTY_SO5_AVERAGE_SCORE)
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

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

interface LoadingSpinnerProps {
  icon: "loader" | "refresh";
  message?: string;
}

function LoadingSpinner({ icon, message }: LoadingSpinnerProps) {
  const Icon = icon === "loader" ? Loader2 : RefreshCw;
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}

interface CardImageProps {
  src: string;
  alt: string;
}

function CardImage({ src, alt }: CardImageProps) {
  return (
    <div className="flex justify-center">
      <Image
        alt={alt}
        className="h-auto max-w-[200px] rounded-lg"
        height={200}
        src={src}
        unoptimized
        width={200}
      />
    </div>
  );
}

interface CardsGridProps {
  cards: CardData[];
  rarityFilter: RarityFilter;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function saveCardsToCache(cards: CardData[], currentUserSlug: string): void {
  const cacheData: CachedData = {
    cards,
    userSlug: currentUserSlug || cards[0]?.slug || "",
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

async function fetchCardPage(
  cursor: string | null,
  pageCount: number,
  signal?: AbortSignal
): Promise<{ cards: CardData[]; cursor: string | null; userSlug?: string }> {
  const response = await fetch("/api/graphql", {
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: { after: cursor },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const waitTime = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return fetchCardPage(cursor, pageCount, signal);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(
      data.errors.map((e: { message: string }) => e.message).join(", ")
    );
  }

  if (!data.data?.currentUser) {
    return { cards: [], cursor: null };
  }

  const newCards = data.data.currentUser.cards?.nodes || [];
  const pageInfo = data.data.currentUser.cards?.pageInfo;
  const nextCursor = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;

  return {
    cards: newCards,
    cursor: nextCursor,
    userSlug: pageCount === 1 ? data.data.currentUser.slug : undefined,
  };
}

function CardsGrid({
  cards,
  rarityFilter,
  onRefresh,
  isRefreshing,
}: CardsGridProps) {
  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No {rarityFilter === "all" ? "limited or rare" : rarityFilter} cards
          found in your collection
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.slug}>
            <CardContent>
              <div className="space-y-3">
                {card.pictureUrl && (
                  <CardImage alt={card.name} src={card.pictureUrl} />
                )}
                {/* Averages */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="text-muted-foreground">L5</div>
                    <div className="font-medium">
                      {card.l5Average?.toFixed(1) ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">L10</div>
                    <div className="font-medium">
                      {card.l10Average?.toFixed(1) ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">L15</div>
                    <div className="font-medium">
                      {card.l15Average?.toFixed(1) ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">L40</div>
                    <div className="font-medium">
                      {card.l40Average?.toFixed(1) ?? "-"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <Button disabled={isRefreshing} onClick={onRefresh} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Aggiornamento..." : "Aggiorna carte"}
        </Button>
      </div>
    </>
  );
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

  const fetchAllCards = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      setLoadingProgress("Fetching cards...");
      const allCards: CardData[] = [];
      let cursor: string | null = null;
      let pageCount = 0;

      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      try {
        do {
          pageCount++;
          setLoadingProgress(
            `Fetching page ${pageCount}... (${allCards.length} cards)`
          );

          const result = await fetchCardPage(cursor, pageCount);
          allCards.push(...result.cards);
          if (result.userSlug) {
            setUserSlug(result.userSlug);
          }
          cursor = result.cursor;

          if (cursor && !ENABLE_PAGINATION) {
            break;
          }

          if (cursor) {
            await delay(1100);
          }
        } while (cursor);

        setCards(allCards);
        setLastUpdate(new Date());
        saveCardsToCache(allCards, userSlug);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch cards");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setLoadingProgress("");
      }
    },
    [userSlug]
  );

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

    await fetchAllCards(false);
  }, [fetchAllCards]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleRefresh = () => {
    fetchAllCards(true);
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
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          rarityFilter={rarityFilter}
        />
      </div>
    </div>
  );
}
