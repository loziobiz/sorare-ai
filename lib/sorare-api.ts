import { GET_CARDS_QUERY } from "./queries";

export interface CardData {
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

export interface CardsResponse {
  cards: CardData[];
  cursor: string | null;
  userSlug?: string;
}

export interface FetchCardsOptions {
  cursor?: string | null;
  pageCount?: number;
  signal?: AbortSignal;
}

export async function fetchCardsPage({
  cursor,
  signal,
}: FetchCardsOptions = {}): Promise<CardsResponse> {
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
    const waitTime = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return fetchCardsPage({ cursor, signal });
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
}

export async function fetchAllCards(
  options: {
    onProgress?: (page: number, totalCards: number) => void;
    enablePagination?: boolean;
    pageDelay?: number;
    signal?: AbortSignal;
  } = {}
): Promise<{ cards: CardData[]; userSlug: string }> {
  const {
    onProgress,
    enablePagination = true,
    pageDelay = 1100,
    signal,
  } = options;

  const allCards: CardData[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  let userSlug = "";

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  do {
    pageCount++;
    const result = await fetchCardsPage({ cursor, signal });
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
