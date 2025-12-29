"use client";

import { LogOut, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardsGrid } from "@/components/cards/card-grid";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SiteNav } from "@/components/site-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCacheCleanup } from "@/hooks/use-indexed-db";
import { logout } from "@/lib/auth";
import {
  ACTIVE_LEAGUES,
  ENABLE_PAGINATION,
  SHOW_ONLY_ACTIVE_LEAGUES,
} from "@/lib/config";
import { DEFAULT_TTL, db } from "@/lib/db";
import type { CardData } from "@/lib/sorare-api";
import { clearAllCaches, fetchAllCards } from "@/lib/sorare-api";

type RarityFilter = "all" | "limited" | "rare";

interface LeagueOption {
  value: string;
  label: string;
}
type PositionFilter =
  | "all"
  | "Goalkeeper"
  | "Defender"
  | "Midfielder"
  | "Forward";
type SortOption = "name" | "team" | "l5" | "l10" | "l15" | "l40";

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

function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    Goalkeeper: "POR",
    Defender: "DIF",
    Midfielder: "CEN",
    Forward: "ATT",
  };
  return labels[position] ?? position;
}

export function CardsDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<CardData[]>([]);
  const [userSlug, setUserSlug] = useState("");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [loadingProgress, setLoadingProgress] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useCacheCleanup();

  // Get unique leagues from cards
  const leagues = useMemo((): LeagueOption[] => {
    const leagueMap = new Map<string, string>();
    const allLeagues = new Set<string>(); // For debug when SHOW_ONLY_ACTIVE_LEAGUES is true

    for (const card of cards) {
      for (const competition of card.anyPlayer?.activeClub
        ?.activeCompetitions ?? []) {
        if (competition.format === "DOMESTIC_LEAGUE" && competition.country) {
          const country = competition.country;
          // Create unique key: "leagueName|countryCode"
          const uniqueKey = `${competition.name}|${country.code}`;
          allLeagues.add(uniqueKey);

          // Check if unique key is in ACTIVE_LEAGUES
          const isAllowed =
            !SHOW_ONLY_ACTIVE_LEAGUES ||
            Object.hasOwn(ACTIVE_LEAGUES, uniqueKey);

          if (isAllowed) {
            const customName = ACTIVE_LEAGUES[uniqueKey];
            // Display: "Serie A" or custom name from config
            const displayName = customName ?? uniqueKey;
            leagueMap.set(uniqueKey, displayName);
          }
        }
      }
    }

    // Debug: log leagues that are not in ACTIVE_LEAGUES
    if (SHOW_ONLY_ACTIVE_LEAGUES && allLeagues.size > 0) {
      const notInConfig = Array.from(allLeagues).filter(
        (key) => !Object.hasOwn(ACTIVE_LEAGUES, key)
      );
      if (notInConfig.length > 0) {
        console.log(
          "Leagues found in cards but not in ACTIVE_LEAGUES config:",
          notInConfig
        );
      }
    }

    return Array.from(leagueMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cards]);

  // Apply filters and sorting
  const displayCards = useMemo(() => {
    let filtered = [...cards];

    // Filter by rarity
    if (rarityFilter !== "all") {
      filtered = filtered.filter(
        (card) => card.rarityTyped.toLowerCase() === rarityFilter
      );
    }

    // Filter by position
    if (positionFilter !== "all") {
      filtered = filtered.filter((card) =>
        card.anyPositions?.includes(positionFilter)
      );
    }

    // Filter by league
    if (leagueFilter !== "all") {
      // leagueFilter format is "leagueName|countryCode"
      const [leagueName, countryCode] = leagueFilter.split("|");
      filtered = filtered.filter((card) =>
        card.anyPlayer?.activeClub?.activeCompetitions?.some(
          (c) =>
            c.format === "DOMESTIC_LEAGUE" &&
            c.name === leagueName &&
            c.country?.code === countryCode
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "team":
          return (a.anyPlayer?.activeClub?.name ?? "").localeCompare(
            b.anyPlayer?.activeClub?.name ?? ""
          );
        case "l5":
          return (b.l5Average ?? 0) - (a.l5Average ?? 0);
        case "l10":
          return (b.l10Average ?? 0) - (a.l10Average ?? 0);
        case "l15":
          return (b.l15Average ?? 0) - (a.l15Average ?? 0);
        case "l40":
          return (b.l40Average ?? 0) - (a.l40Average ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [cards, rarityFilter, positionFilter, leagueFilter, sortBy]);

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
          cacheTtl: isRefresh ? 0 : undefined,
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
    await fetchCards(false);
  };

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
      <SiteNav />
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Rarity Filter */}
        <div className="flex items-center gap-2">
          <label className="font-medium text-sm" htmlFor="rarity-filter">
            Rarità:
          </label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="rarity-filter"
            onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
            value={rarityFilter}
          >
            <option value="all">Tutte</option>
            <option value="limited">Limited</option>
            <option value="rare">Rare</option>
          </select>
        </div>

        {/* Position Filter */}
        <div className="flex items-center gap-2">
          <label className="font-medium text-sm" htmlFor="position-filter">
            Ruolo:
          </label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="position-filter"
            onChange={(e) =>
              setPositionFilter(e.target.value as PositionFilter)
            }
            value={positionFilter}
          >
            <option value="all">Tutti</option>
            <option value="Goalkeeper">{getPositionLabel("Goalkeeper")}</option>
            <option value="Defender">{getPositionLabel("Defender")}</option>
            <option value="Midfielder">{getPositionLabel("Midfielder")}</option>
            <option value="Forward">{getPositionLabel("Forward")}</option>
          </select>
        </div>

        {/* League Filter */}
        <div className="flex items-center gap-2">
          <label className="font-medium text-sm" htmlFor="league-filter">
            Lega:
          </label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="league-filter"
            onChange={(e) => setLeagueFilter(e.target.value)}
            value={leagueFilter}
          >
            <option value="all">Tutte</option>
            {leagues.map((league) => (
              <option key={league.value} value={league.value}>
                {league.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="font-medium text-sm" htmlFor="sort-by">
            Ordina per:
          </label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="sort-by"
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            value={sortBy}
          >
            <option value="name">Nome</option>
            <option value="team">Squadra</option>
            <option value="l5">Media L5</option>
            <option value="l15">Media L15</option>
            <option value="l40">Media L40</option>
          </select>
        </div>
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
          emptyMessage="Nessuna carta trovata con i filtri selezionati"
          showCardAverages
          showCardPositions={false}
        />
      </div>
    </div>
  );
}
