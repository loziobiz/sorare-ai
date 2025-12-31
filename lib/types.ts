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
 * Tipi per la risposta GraphQL
 */
export interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}
