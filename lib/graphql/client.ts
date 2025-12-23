import { GraphQLClient } from 'graphql-request';

const GRAPHQL_API_URL = process.env.NEXT_PUBLIC_SORARE_API_URL || 'https://api.sorare.com/federation/graphql';
const JWT_AUD = process.env.JWT_AUD || 'sorare-ai';

/**
 * GraphQL client configurato per chiamate server-to-server
 */
export const createGraphQLClient = (token?: string) => {
  const headers: Record<string, string> = {
    'JWT-AUD': JWT_AUD,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new GraphQLClient(GRAPHQL_API_URL, {
    headers,
  });
};

// Client base senza autenticazione
export const graphqlClient = createGraphQLClient();

