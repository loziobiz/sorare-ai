import { graphqlProxy } from "../api-server";
import { DEFAULT_TTL, getCache, setCache } from "../db";
import {
  GET_CARD_SETS_AND_USER,
  GET_COLLECTION_CARDS,
  GET_STELLAR_COLLECTION_SLUGS,
} from "./queries";
import type {
  CardSetsAndUserResponse,
  CollectionCardsResponse,
  CollectionSlugsResponse,
  StellarCacheData,
  StellarCard,
  StellarCollection,
  StellarCollectionInfo,
  StellarFlatCard,
} from "./types";

const CACHE_KEY_CARD_SETS = "stellar_card_sets_and_user";
const CACHE_KEY_CARDS = "stellar_cards";
const REQUEST_DELAY_MS = 1100;

interface CardSetsAndUser {
  userSlug: string;
  cardSets: Array<{ id: string; name: string; slug: string; active: boolean }>;
}

export async function fetchCardSetsAndUser(): Promise<CardSetsAndUser> {
  const cached = await getCache<CardSetsAndUser>(CACHE_KEY_CARD_SETS);
  if (cached) {
    return cached;
  }

  const result = await graphqlProxy({
    data: { query: GET_CARD_SETS_AND_USER },
  });

  const response = result.data as CardSetsAndUserResponse;
  const data: CardSetsAndUser = {
    userSlug: response.currentUser.slug,
    cardSets: response.cardSets.nodes,
  };

  await setCache(CACHE_KEY_CARD_SETS, data, DEFAULT_TTL.LONG);
  return data;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Step 1: Fetch all collection slugs (lightweight, paginated) */
async function fetchCollectionSlugs(
  cardSetSlug: string
): Promise<StellarCollectionInfo[]> {
  const allCollections: StellarCollectionInfo[] = [];
  let cursor: string | null = null;

  do {
    const result = await graphqlProxy({
      data: {
        query: GET_STELLAR_COLLECTION_SLUGS,
        variables: { cardSetSlug, after: cursor },
      },
    });

    const response = result.data as CollectionSlugsResponse;
    const { nodes, pageInfo } = response.currentUser.cardCollections;
    allCollections.push(...nodes);

    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    if (cursor) {
      await delay(REQUEST_DELAY_MS);
    }
  } while (cursor);

  return allCollections;
}

/** Step 2: Fetch cards for a single collection (root query, avoids list nesting restriction) */
async function fetchCollectionCards(
  slug: string,
  userSlug: string
): Promise<StellarCollection> {
  const result = await graphqlProxy({
    data: {
      query: GET_COLLECTION_CARDS,
      variables: { slug, userSlug },
    },
  });

  const response = result.data as CollectionCardsResponse;
  return response.cardCollection;
}

function formatOpponent(
  nextGame: StellarCard["anyPlayer"]["nextGame"],
  playerClubName: string | null
): string | null {
  if (!nextGame) {
    return null;
  }
  const isHome = nextGame.homeTeam?.name === playerClubName;
  const opponent = isHome ? nextGame.awayTeam : nextGame.homeTeam;
  if (!opponent) {
    return null;
  }
  return `${isHome ? "vs" : "@"} ${opponent.code ?? opponent.name}`;
}

function flattenCollection(collection: StellarCollection): StellarFlatCard[] {
  const userCollection = collection.userCardCollection;
  if (!userCollection) {
    return [];
  }

  return userCollection.cardCollectionCards.map((collCard) => {
    const { anyCard } = collCard;
    const clubName = anyCard.anyPlayer.activeClub?.name ?? null;

    return {
      slug: anyCard.slug,
      name: anyCard.name,
      pictureUrl: anyCard.pictureUrl,
      rarityTyped: anyCard.rarityTyped,
      positions: anyCard.anyPositions,
      power: anyCard.power,
      cardEditionName: anyCard.cardEditionName,
      l10Average: anyCard.l10Average,
      projectedScore:
        anyCard.anyPlayer.nextClassicFixtureProjectedScore ?? null,
      starterOdds:
        anyCard.anyPlayer.nextClassicFixturePlayingStatusOdds
          ?.starterOddsBasisPoints == null
          ? null
          : anyCard.anyPlayer.nextClassicFixturePlayingStatusOdds
              .starterOddsBasisPoints / 100,
      lastScores: anyCard.anyPlayer.rawPlayerGameScores ?? [],
      nextGameDate: anyCard.anyPlayer.nextGame?.date ?? null,
      nextGameOpponent: formatOpponent(anyCard.anyPlayer.nextGame, clubName),
      playerName: anyCard.anyPlayer.displayName,
      clubName,
      clubPictureUrl: anyCard.anyPlayer.activeClub?.pictureUrl ?? null,
      collectionName: collection.name,
      collectionSlug: collection.slug,
      collectionScore: userCollection.score,
      heldSince: collCard.heldSince,
      scoreInCollection: collCard.scoreBreakdown.total,
    };
  });
}

export async function fetchStellarCards(
  cardSetSlug: string,
  userSlug: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<StellarCacheData> {
  // Step 1: get all collection slugs
  onProgress?.("Recupero collezioni...", 0, 0);
  const collectionInfos = await fetchCollectionSlugs(cardSetSlug);

  // Step 2: fetch cards for each collection individually
  const allCards: StellarFlatCard[] = [];
  let completeCollections = 0;

  for (let i = 0; i < collectionInfos.length; i++) {
    const info = collectionInfos[i];
    onProgress?.(info.name, i + 1, collectionInfos.length);

    const collection = await fetchCollectionCards(info.slug, userSlug);
    const cards = flattenCollection(collection);
    allCards.push(...cards);

    if (collection.userCardCollection?.complete) {
      completeCollections++;
    }

    // Rate limit between requests
    if (i < collectionInfos.length - 1) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  const cacheData: StellarCacheData = {
    cards: allCards,
    cardSetName: cardSetSlug,
    cardSetSlug,
    totalCollections: collectionInfos.length,
    completeCollections,
    downloadedAt: Date.now(),
  };

  await setCache(CACHE_KEY_CARDS, cacheData, DEFAULT_TTL.LONG);
  return cacheData;
}

export function getCachedStellarCards(): Promise<StellarCacheData | null> {
  return getCache<StellarCacheData>(CACHE_KEY_CARDS);
}

export async function clearStellarCache(): Promise<void> {
  const { invalidateCache } = await import("../db");
  await invalidateCache("stellar_");
}
