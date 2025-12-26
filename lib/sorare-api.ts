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
  anyTeam?: {
    name: string;
    pictureUrl?: string;
    activeCompetitions?: Array<{
      name: string;
      displayName: string;
      format: string;
    }>;
  };
  l5Average?: number;
  l10Average?: number;
  l15Average?: number;
  l40Average?: number;
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
    const response = await fetch("/api/graphql", {
      body: JSON.stringify({
        query: GET_CARDS_QUERY,
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
      const waitTime = retryAfter
        ? Number.parseInt(retryAfter, 10) * 1000
        : 2000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return fetchCardsPage({ cursor, signal, useCache: false });
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
      userSlug: data.data.currentUser.slug,
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
