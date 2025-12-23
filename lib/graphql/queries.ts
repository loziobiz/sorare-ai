/**
 * Query per ottenere le carte dell'utente
 */
export const GET_CARDS_QUERY = `
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

/**
 * Interfaccia per la risposta della query GetCards
 */
export type GetCardsQueryResponse = {
  currentUser?: {
    slug: string;
    cards?: {
      nodes: {
        slug: string;
        name: string;
        rarityTyped: string;
        anyPositions?: string[];
        pictureUrl?: string;
        l5Average?: number;
        l10Average?: number;
        l15Average?: number;
        l40Average?: number;
      }[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
};

/**
 * Variabili per la query
 */
export type GetCardsVariables = {
  after?: string | null;
};
