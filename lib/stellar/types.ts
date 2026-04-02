export interface StellarCardSet {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface StellarPlayerClub {
  name: string;
  pictureUrl?: string;
}

export interface StellarNextGame {
  date: string;
  homeTeam: { name: string; code?: string } | null;
  awayTeam: { name: string; code?: string } | null;
}

export interface StellarPlayer {
  displayName: string;
  activeClub?: StellarPlayerClub;
  nextClassicFixtureProjectedScore?: number | null;
  nextGame?: StellarNextGame | null;
}

export interface StellarCard {
  slug: string;
  name: string;
  pictureUrl: string | null;
  rarityTyped: string;
  anyPositions: string[];
  power: string | null;
  cardEditionName: string | null;
  l10Average: number | null;
  anyPlayer: StellarPlayer;
}

export interface StellarCollectionCard {
  id: string;
  heldSince: string;
  scoreBreakdown: { total: number };
  anyCard: StellarCard;
}

export interface StellarUserCollection {
  score: number;
  bonus: number;
  complete: boolean;
  fulfilledSlotsCount: number;
  slotsCount: number;
  cardCollectionCards: StellarCollectionCard[];
}

/** Lightweight collection info (from list query, no nested cards) */
export interface StellarCollectionInfo {
  name: string;
  slug: string;
  rarity: string | null;
  inSeason: boolean;
}

/** Full collection with user data (from individual query) */
export interface StellarCollection extends StellarCollectionInfo {
  userCardCollection: StellarUserCollection | null;
}

/** Flat card for display in the grid */
export interface StellarFlatCard {
  slug: string;
  name: string;
  pictureUrl: string | null;
  rarityTyped: string;
  positions: string[];
  power: string | null;
  cardEditionName: string | null;
  l10Average: number | null;
  projectedScore: number | null;
  nextGameDate: string | null;
  nextGameOpponent: string | null;
  playerName: string;
  clubName: string | null;
  clubPictureUrl: string | null;
  collectionName: string;
  collectionSlug: string;
  collectionScore: number;
  heldSince: string;
  scoreInCollection: number;
}

/** Cached stellar data */
export interface StellarCacheData {
  cards: StellarFlatCard[];
  cardSetName: string;
  cardSetSlug: string;
  totalCollections: number;
  completeCollections: number;
  downloadedAt: number;
}

/** Response types for GQL queries */
export interface CardSetsAndUserResponse {
  currentUser: { slug: string };
  cardSets: {
    nodes: StellarCardSet[];
  };
}

/** Response for collection slugs list query */
export interface CollectionSlugsResponse {
  currentUser: {
    cardCollections: {
      nodes: StellarCollectionInfo[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

/** Response for individual collection cards query */
export interface CollectionCardsResponse {
  cardCollection: StellarCollection;
}
