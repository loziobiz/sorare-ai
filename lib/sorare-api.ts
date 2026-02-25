import { graphqlProxy } from "./api-server";
import { db } from "./db";
import { cachedFetch, graphqlCache } from "./graphql-cache";
import { GET_CARDS_QUERY } from "./queries";

export interface CardData {
  slug: string;
  name: string;
  rarityTyped: string;
  anyPositions?: string[];
  pictureUrl?: string;
  inSeasonEligible?: boolean;
  cardPrice?: number | null;
  lowestPriceCard?: {
    slug: string;
    cardPrice?: number | null;
  } | null;
  latestPrimaryOffer?: {
    price?: {
      eurCents?: number | null;
      usdCents?: number | null;
      referenceCurrency?: string | null;
    } | null;
    status: string;
  } | null;
  priceRange?: {
    min?: string | null;
    max?: string | null;
  } | null;
  anyPlayer?: {
    activeClub?: {
      name: string;
      pictureUrl?: string;
      activeCompetitions?: Array<{
        name: string;
        displayName: string;
        format: string;
        country?: {
          code: string;
          name: string;
        };
      }>;
    };
    nextGame?: {
      date?: string | null;
      homeTeam?: {
        name?: string;
      } | null;
      awayTeam?: {
        name?: string;
      } | null;
    } | null;
  };
  l5Average?: number;
  l10Average?: number;
  l15Average?: number;
  l40Average?: number;
  power?: string;
  powerBreakdown?: {
    xp?: number;
    season?: number;
  };
  sealed?: boolean;
  sealedAt?: string | null;
  ownershipHistory?: Array<{
    amounts?: {
      eurCents?: number | null;
      referenceCurrency?: string;
    } | null;
    from: string;
    transferType: string;
  }>;
  so5Scores?: Array<{
    score: number;
    projectedScore: number;
    scoreStatus: string;
    game?: {
      date?: string | null;
      homeTeam?: {
        name?: string;
      } | null;
      awayTeam?: {
        name?: string;
      } | null;
    } | null;
  }>;
  liveSingleSaleOffer?: {
    owners?: Array<{
      amounts?: {
        eurCents?: number | null;
        referenceCurrency?: string;
      } | null;
    } | null>;
  } | null;
  privateMinPrices?: {
    eurCents?: number | null;
    referenceCurrency?: string;
  } | null;
  publicMinPrices?: {
    eurCents?: number | null;
    referenceCurrency?: string;
  } | null;
}

export interface CardsResponse {
  cards: CardData[];
  cursor: string | null;
  userSlug?: string;
}

export interface FetchCardsOptions {
  cursor?: string | null;
  pageCount?: number;
  signal?: AbortSignal;
  useCache?: boolean;
  cacheTtl?: number;
}

const DEFAULT_CACHE_TTL = 30 * 60 * 1000; // 30 minuti

export async function fetchCardsPage({
  cursor,
  signal,
  useCache = true,
  cacheTtl = DEFAULT_CACHE_TTL,
}: FetchCardsOptions = {}): Promise<CardsResponse> {
  const request = {
    query: GET_CARDS_QUERY,
    variables: { after: cursor },
  };

  const fetcher = async (): Promise<CardsResponse> => {
    const result = await graphqlProxy({
      data: {
        query: GET_CARDS_QUERY,
        variables: { after: cursor },
      },
    });

    if (!result.data?.currentUser) {
      return { cards: [], cursor: null };
    }

    const newCards = (result.data.currentUser.cards?.nodes || []).filter(
      (card: CardData) => {
        // Escludi carte NBA (hanno "NBA" tra le competizioni)
        const competitions =
          card.anyPlayer?.activeClub?.activeCompetitions || [];
        return !competitions.some((c) => c.name === "NBA");
      }
    );

    // DEBUG: log prima carta per vedere i dati monetari
    if (newCards.length > 0) {
      console.log("DEBUG - First card price data:", {
        slug: newCards[0].slug,
        ownershipHistory: newCards[0].ownershipHistory,
        liveSingleSaleOffer: newCards[0].liveSingleSaleOffer,
        privateMinPrices: newCards[0].privateMinPrices,
        publicMinPrices: newCards[0].publicMinPrices,
        lowestPriceCard: newCards[0].lowestPriceCard,
      });
    }
    const pageInfo = result.data.currentUser.cards?.pageInfo;
    const nextCursor = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;

    return {
      cards: newCards,
      cursor: nextCursor,
      userSlug: result.data.currentUser.slug,
    };
  };

  if (useCache) {
    return await cachedFetch(request, fetcher, cacheTtl);
  }

  return await fetcher();
}

export async function fetchAllCards(
  options: {
    onProgress?: (page: number, totalCards: number) => void;
    enablePagination?: boolean;
    pageDelay?: number;
    signal?: AbortSignal;
    cacheTtl?: number;
  } = {}
): Promise<{ cards: CardData[]; userSlug: string }> {
  const {
    onProgress,
    enablePagination = true,
    pageDelay = 1100,
    signal,
    cacheTtl = DEFAULT_CACHE_TTL,
  } = options;

  const allCards: CardData[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  let userSlug = "";

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  do {
    pageCount++;
    const result = await fetchCardsPage({
      cacheTtl,
      cursor,
      signal,
      useCache: pageCount === 1, // Usa cache solo per la prima pagina
    });
    allCards.push(...result.cards);

    if (result.userSlug) {
      userSlug = result.userSlug;
    }

    onProgress?.(pageCount, allCards.length);
    cursor = result.cursor;

    if (cursor && !enablePagination) {
      break;
    }

    if (cursor) {
      await delay(pageDelay);
    }
  } while (cursor);

  return { cards: allCards, userSlug };
}

export async function invalidateCardsCache(): Promise<void> {
  await graphqlCache.clear();
}

export async function clearAllCaches(): Promise<void> {
  // Clear GraphQL Cache API
  await graphqlCache.clear();

  // Clear IndexedDB cache
  await db.cache.clear();
  await db.cachedCards.clear();

  // Clear all Cache API caches (including service worker caches)
  if (typeof caches !== "undefined") {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
}
