import { c as createServerRpc, a as createGraphQLClient } from "./client-DBwjQyw9.js";
import { g as getAuthToken } from "./auth-server-BVOMZ7KW.js";
import { c as createServerFn } from "../server.js";
import "graphql-request";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "node:async_hooks";
import "@tanstack/router-core/ssr/server";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "@tanstack/react-router";
const graphqlProxy_createServerFn_handler = createServerRpc({
  id: "839441a41d5dbe2adf36bea048fa4b81e937fbb4fef4a9b95d1c3bfd0513a0ca",
  name: "graphqlProxy",
  filename: "lib/api-server.ts"
}, (opts) => graphqlProxy.__executeServer(opts));
const graphqlProxy = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(graphqlProxy_createServerFn_handler, async ({
  data
}) => {
  try {
    const token = await getAuthToken();
    const client = createGraphQLClient(token);
    const result = await client.request(data.query, data.variables);
    return {
      data: result
    };
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    if (error instanceof Error && "response" in error) {
      const errorResponse = error;
      if (errorResponse.response?.errors) {
        throw new Error(errorResponse.response.errors.map((e) => e.message).join(", "));
      }
    }
    throw new Error(error instanceof Error ? error.message : "Failed to execute GraphQL query");
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
const testPrice_createServerFn_handler = createServerRpc({
  id: "1cb658687d1b8c9f8e9d3cf81d4ea8805f29e8e2850d15eedb26d14b1f07b87c",
  name: "testPrice",
  filename: "lib/api-server.ts"
}, (opts) => testPrice.__executeServer(opts));
const testPrice = createServerFn({
  method: "GET"
}).handler(testPrice_createServerFn_handler, async () => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const client = createGraphQLClient(token);
  const data = await client.request(TEST_PRICE_QUERY);
  return {
    data
  };
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
const testRange_createServerFn_handler = createServerRpc({
  id: "e44da196012487c25bff7773c9ff6ae16e361129d744e208d7ca1e80d14af995",
  name: "testRange",
  filename: "lib/api-server.ts"
}, (opts) => testRange.__executeServer(opts));
const testRange = createServerFn({
  method: "GET"
}).handler(testRange_createServerFn_handler, async () => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const client = createGraphQLClient(token);
  const data = await client.request(TEST_RANGE_QUERY);
  return {
    data
  };
});
export {
  graphqlProxy_createServerFn_handler,
  testPrice_createServerFn_handler,
  testRange_createServerFn_handler
};
