'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, User, Trophy, RefreshCw } from 'lucide-react';

type RarityFilter = 'all' | 'limited' | 'rare';

interface CardData {
  slug: string;
  name: string;
  rarityTyped: string;
  anyPositions?: string[];
  pictureUrl?: string;
  power?: string;
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

const CACHE_KEY = 'sorare_cards_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ore
const ENABLE_PAGINATION = false; // Imposta a true per abilitare il caricamento completo

export function CardsDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<CardData[]>([]);
  const [userSlug, setUserSlug] = useState('');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [loadingProgress, setLoadingProgress] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
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
        } catch (e) {
          console.error('Failed to parse cache:', e);
        }
      }
    }

    // Fetch fresh data
    await fetchAllCards(forceRefresh);
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const fetchAllCards = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    setLoadingProgress('Fetching cards...');
    const allCards: CardData[] = [];
    let cursor: string | null = null;
    let pageCount = 0;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      do {
        pageCount++;
        setLoadingProgress(`Fetching page ${pageCount}... (${allCards.length} cards)`);

        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
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
                      power
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
            `,
            variables: { after: cursor },
          }),
        });

        // Rate limit handling
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
          setLoadingProgress(`Rate limited. Waiting ${waitTime / 1000}s...`);
          await delay(waitTime);
          continue;
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(data.errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (data.data?.currentUser) {
          const newCards = data.data.currentUser.cards?.nodes || [];
          allCards.push(...newCards);

          if (pageCount === 1) {
            setUserSlug(data.data.currentUser.slug);
          }

          const pageInfo = data.data.currentUser.cards?.pageInfo;
          cursor = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;
        }

        // Small delay between pages to stay within rate limits (60 calls/min = ~1 call/sec)
        if (cursor) {
          // Stop after first page if pagination is disabled (for development)
          if (!ENABLE_PAGINATION) {
            break;
          }
          await delay(1100);
        }
      } while (cursor);

      setCards(allCards);
      setLastUpdate(new Date());

      // Save to cache
      const cacheData: CachedData = {
        cards: allCards,
        userSlug: userSlug || allCards[0]?.slug || '',
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cards');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLoadingProgress('');
    }
  };

  const handleRefresh = () => {
    fetchAllCards(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'limited':
        return 'text-purple-600';
      case 'rare':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredCards = cards.filter(card => {
    const rarity = card.rarityTyped.toLowerCase();
    return rarity === 'limited' || rarity === 'rare';
  });

  const displayCards = filteredCards.filter(card => {
    if (rarityFilter === 'all') return true;
    return card.rarityTyped.toLowerCase() === rarityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sorare AI Dashboard</h1>
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
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna carte
          </Button>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limited</CardTitle>
            <Trophy className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCards.filter(c => c.rarityTyped.toLowerCase() === 'limited').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rare</CardTitle>
            <Trophy className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCards.filter(c => c.rarityTyped.toLowerCase() === 'rare').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={rarityFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setRarityFilter('all')}
        >
          Tutte
        </Button>
        <Button
          variant={rarityFilter === 'limited' ? 'default' : 'outline'}
          onClick={() => setRarityFilter('limited')}
        >
          Limited
        </Button>
        <Button
          variant={rarityFilter === 'rare' ? 'default' : 'outline'}
          onClick={() => setRarityFilter('rare')}
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

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          {loadingProgress && (
            <p className="text-sm text-muted-foreground">{loadingProgress}</p>
          )}
        </div>
      ) : isRefreshing ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          {loadingProgress && (
            <p className="text-sm text-muted-foreground">{loadingProgress}</p>
          )}
        </div>
      ) : (
        /* Cards Grid */
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            Your Cards ({displayCards.length})
          </h2>

          {displayCards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No {rarityFilter === 'all' ? 'limited or rare' : rarityFilter} cards found in your collection
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayCards.map((card) => (
                <Card key={card.slug}>
                  <CardHeader>
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {card.pictureUrl && (
                        <div className="flex justify-center">
                          <img
                            src={card.pictureUrl}
                            alt={card.name}
                            className="max-w-[200px] h-auto rounded-lg"
                          />
                        </div>
                      )}
                      {card.anyPositions && card.anyPositions.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Position:</span> {card.anyPositions.join(', ')}
                        </div>
                      )}
                      {/* Total Bonus (Power) */}
                      {card.power && (
                        <div className="text-sm bg-primary/10 p-2 rounded-md text-center">
                          <span className="font-medium">Total Bonus:</span> <span className="font-bold">{card.power}</span>
                        </div>
                      )}
                      {/* Averages */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <div className="text-muted-foreground">L5</div>
                          <div className="font-medium">{card.l5Average?.toFixed(1) ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">L10</div>
                          <div className="font-medium">{card.l10Average?.toFixed(1) ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">L15</div>
                          <div className="font-medium">{card.l15Average?.toFixed(1) ?? '-'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">L40</div>
                          <div className="font-medium">{card.l40Average?.toFixed(1) ?? '-'}</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {card.slug}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Refresh Button */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleRefresh} variant="outline" disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Aggiornamento...' : 'Aggiorna carte'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

