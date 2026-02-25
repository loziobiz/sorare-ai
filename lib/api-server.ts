import { createServerFn } from "@tanstack/react-start";
import { getAuthToken } from "./auth-server";
import { createGraphQLClient } from "./graphql/client";

/**
 * Server function per il proxy GraphQL
 */
export const graphqlProxy = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; variables?: Record<string, unknown> }) => data)
  .handler(async ({ data }) => {
    try {
      const token = await getAuthToken();
      const client = createGraphQLClient(token);
      const result = await client.request(data.query, data.variables);
      return { data: result };
    } catch (error) {
      console.error("GraphQL proxy error:", error);
      if (error instanceof Error && "response" in error) {
        const errorResponse = error as {
          response?: { errors?: Array<{ message: string }> };
        };
        if (errorResponse.response?.errors) {
          throw new Error(
            errorResponse.response.errors.map((e) => e.message).join(", ")
          );
        }
      }
      throw new Error(
        error instanceof Error ? error.message : "Failed to execute GraphQL query"
      );
    }
  });

const TEST_PRICE_QUERY = `
  query GetTestCardPrice {
    currentUser {
      cards(first: 5, rarities: [limited, rare]) {
        nodes {
          slug
          name
          rarityTyped
          anyPlayer {
            displayName
            limitedCardPrice: cardPrice(rarity: limited)
            rareCardPrice: cardPrice(rarity: rare)
          }
        }
      }
    }
  }
`;

/**
 * Server function per test prezzi
 */
export const testPrice = createServerFn({ method: "GET" }).handler(async () => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const client = createGraphQLClient(token);
  const data = await client.request(TEST_PRICE_QUERY);
  return { data };
});

const TEST_RANGE_QUERY = `
  query GetTestPriceRange {
    currentUser {
      cards(first: 5, rarities: [limited, rare]) {
        nodes {
          slug
          name
          rarityTyped
          priceRange {
            min
            max
          }
        }
      }
    }
  }
`;

/**
 * Server function per test range prezzi
 */
export const testRange = createServerFn({ method: "GET" }).handler(async () => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const client = createGraphQLClient(token);
  const data = await client.request(TEST_RANGE_QUERY);
  return { data };
});
