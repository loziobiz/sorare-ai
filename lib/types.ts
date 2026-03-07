/**
 * Tipi per l'autenticazione Sorare
 */
export interface SignInInput {
  email: string;
  password: string;
  otpAttempt?: string;
  otpSessionChallenge?: string;
}

export interface SignInResponse {
  currentUser?: {
    slug: string;
  };
  jwtToken?: {
    token: string;
    expiredAt: string;
  };
  otpSessionChallenge?: string;
  errors?: {
    message: string;
    code?: string;
  }[];
}

/**
 * Tipi per le carte Sorare
 */
export interface Card {
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

export interface CardsResponse {
  currentUser?: {
    slug: string;
    cards?: {
      nodes: Card[];
    };
  };
}

/**
 * Tipi per i risultati So5
 */
export interface So5Appearance {
  id: string;
  captain: boolean;
  score: number;
  bonusPoints?: number;
  anyCard?: {
    slug: string;
    name: string;
    rarityTyped: string;
    pictureUrl?: string;
    anyPositions?: string[];
  };
  anyPlayer?: {
    displayName: string;
    slug: string;
  };
}

export interface So5Leaderboard {
  slug: string;
  displayName: string;
  division: number;
}

export interface So5Lineup {
  id: string;
  name: string;
  score?: number;
  so5Leaderboard: So5Leaderboard;
  so5Appearances: So5Appearance[];
}

export interface So5Reward {
  id: string;
  amount?: {
    eurCents?: number;
  };
}

export interface So5Ranking {
  ranking: number;
  score: number;
  eligibleForReward: boolean;
  so5Rewards?: So5Reward[];
}

export interface So5Fixture {
  slug: string;
  gameWeek: number;
  displayName: string;
  startDate?: string;
  endDate?: string;
  mySo5Lineups: So5Lineup[];
  mySo5Rankings: So5Ranking[];
}

export interface So5ResultsResponse {
  so5: {
    so5Fixture: So5Fixture;
  };
}

export interface So5FixturesResponse {
  so5: {
    allSo5Fixtures: {
      nodes: Array<{
        slug: string;
        gameWeek: number;
        displayName: string;
        startDate?: string;
        endDate?: string;
      }>;
    };
  };
}

/**
 * Tipi per la risposta GraphQL
 */
export interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}
