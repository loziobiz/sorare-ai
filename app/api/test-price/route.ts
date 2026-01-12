import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { createGraphQLClient } from "@/lib/graphql/client";

const TEST_QUERY = `
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

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = createGraphQLClient(token);
    const data = await client.request(TEST_QUERY);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Test query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    );
  }
}
