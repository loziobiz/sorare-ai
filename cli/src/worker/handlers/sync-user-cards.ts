/**
 * Sync User Cards Handler
 *
 * Eseguito periodicamente (cron settimanale).
 * - Legge tutti gli utenti con JWT salvato
 * - Per ogni utente con token valido, scarica le carte da Sorare
 * - Salva le carte nel KV usando la stessa struttura del client
 */

import { listUsersWithJWT, updateLastSync, getUserJWT } from "./user-jwt.js";
import { saveUserCard, extractCorrectPlayerSlug } from "./user-cards.js";
import { SorareWorkerClient } from "../lib/sorare-client.js";

// Query GraphQL per ottenere le carte dell'utente corrente
const GET_USER_CARDS = `
  query GetUserCards($cursor: String) {
    currentUser {
      cards(first: 50, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          slug
          name
          rarity
          serialNumber
          pictureUrl
          inSeasonEligible
          power
          powerBreakdown {
            xp
            season
          }
          l5Average
          l10Average
          l15Average
          l40Average
          cardPrice
          lowestPriceCard {
            slug
            cardPrice
          }
          anyPositions
          player {
            slug
            displayName
            activeClub {
              slug
              name
              code
            }
          }
          so5Scores(last: 10) {
            edges {
              node {
                score
                projectedScore
                scoreStatus
                game {
                  date
                  homeTeam {
                    name
                  }
                  awayTeam {
                    name
                  }
                }
              }
            }
          }
          ownershipHistory {
            transferType
            from
            amounts {
              eurCents
              referenceCurrency
            }
          }
          activeCompetitions {
            name
            slug
          }
        }
      }
    }
  }
`;

interface SorareCard {
  slug: string;
  name: string;
  rarity: string;
  serialNumber: number;
  pictureUrl?: string;
  inSeasonEligible?: boolean;
  power?: string;
  powerBreakdown?: { xp?: string; season?: string };
  l5Average?: number;
  l10Average?: number;
  l15Average?: number;
  l40Average?: number;
  cardPrice?: number | null;
  lowestPriceCard?: { slug: string; cardPrice?: number | null } | null;
  anyPositions?: string[];
  player: {
    slug: string;
    displayName: string;
    activeClub?: {
      slug: string;
      name: string;
      code?: string;
    } | null;
  };
  so5Scores?: {
    edges: Array<{
      node: {
        score: number;
        projectedScore: number;
        scoreStatus: string;
        game?: {
          date: string;
          homeTeam: { name: string };
          awayTeam: { name: string };
        };
      };
    }>;
  };
  ownershipHistory?: Array<{
    transferType: string;
    from: string;
    amounts?: { eurCents?: number; referenceCurrency?: string } | null;
  }>;
  activeCompetitions?: Array<{ name: string; slug: string }>;
}

interface UserCardsResponse {
  currentUser: {
    cards: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: SorareCard[];
    };
  } | null;
}

export interface SyncUserCardsResult {
  usersProcessed: number;
  usersSkipped: number;
  totalCards: number;
  errors: string[];
  details: Array<{
    userId: string;
    cardsSynced: number;
    error?: string;
  }>;
}

/**
 * Scarica tutte le carte di un utente da Sorare
 */
async function fetchUserCards(
  token: string
): Promise<SorareCard[]> {
  const cards: SorareCard[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  // Crea un client temporaneo con il token dell'utente specifico
  const userClient = new SorareWorkerClient({
    jwtToken: token,
    jwtAud: "sorare-ai",
  });
  
  while (hasNextPage) {
    try {
      const data = await userClient.query<UserCardsResponse>(GET_USER_CARDS, {
        cursor,
      });

      if (!data.currentUser) {
        console.warn("[SyncCards] No currentUser in response");
        break;
      }

      cards.push(...data.currentUser.cards.nodes);

      hasNextPage = data.currentUser.cards.pageInfo.hasNextPage;
      cursor = data.currentUser.cards.pageInfo.endCursor;

      // Delay tra pagine per rispettare rate limit
      if (hasNextPage) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("[SyncCards] Error fetching cards:", error);
      throw error;
    }
  }

  return cards;
}

/**
 * Converte una carta Sorare nel formato SaveCardRequest
 */
function convertToSaveCardRequest(
  card: SorareCard,
  userId: string
): {
  userId: string;
  clubCode: string;
  playerSlug: string;
  cardData: Record<string, unknown>;
} {
  const clubCode = card.player.activeClub?.code || "UNK";
  
  // Estrai lo slug corretto del giocatore
  const correctPlayerSlug = extractCorrectPlayerSlug(card.slug, card.player.slug);

  return {
    userId,
    clubCode,
    playerSlug: correctPlayerSlug,
    cardData: {
      slug: card.slug,
      name: card.name,
      rarityTyped: card.rarity,
      serialNumber: card.serialNumber,
      pictureUrl: card.pictureUrl,
      inSeasonEligible: card.inSeasonEligible,
      sealed: false,
      power: card.power,
      powerBreakdown: card.powerBreakdown,
      l5Average: card.l5Average,
      l10Average: card.l10Average,
      l15Average: card.l15Average,
      l40Average: card.l40Average,
      cardPrice: card.cardPrice,
      lowestPriceCard: card.lowestPriceCard,
      anyPositions: card.anyPositions || [],
      playerSlug: correctPlayerSlug,
      clubName: card.player.activeClub?.name,
      player: {
        slug: card.player.slug,
        displayName: card.player.displayName,
      },
      so5Scores: card.so5Scores?.edges.map((e) => ({
        score: e.node.score,
        projectedScore: e.node.projectedScore,
        scoreStatus: e.node.scoreStatus,
        game: e.node.game,
      })) || [],
      ownershipHistory: card.ownershipHistory || [],
      activeCompetitions: card.activeCompetitions || [],
    },
  };
}

/**
 * Handler principale per sincronizzare le carte di tutti gli utenti
 */
export async function syncUserCardsHandler(
  kv: KVNamespace,
  client: SorareWorkerClient
): Promise<SyncUserCardsResult> {
  console.log("🔄 [Sync User Cards] Starting...");

  const result: SyncUserCardsResult = {
    usersProcessed: 0,
    usersSkipped: 0,
    totalCards: 0,
    errors: [],
    details: [],
  };

  try {
    // 1. Ottieni tutti gli utenti con JWT
    const users = await listUsersWithJWT(kv);
    console.log(`Found ${users.length} users with JWT saved`);

    // 2. Filtra solo quelli con token valido
    const validUsers = users.filter((u) => u.isValid);
    console.log(`${validUsers.length} users have valid tokens`);

    // 3. Processa ogni utente
    for (const user of validUsers) {
      console.log(`[${result.usersProcessed + 1}/${validUsers.length}] Processing ${user.userId}...`);

      try {
        // Recupera il JWT decifrato
        const jwtData = await getUserJWT(kv, user.userId);
        if (!jwtData) {
          console.log(`  ⏭️ Token not available for ${user.userId}`);
          result.usersSkipped++;
          result.details.push({ userId: user.userId, cardsSynced: 0, error: "Token not available" });
          continue;
        }

        // Scarica le carte usando il token specifico dell'utente
        console.log(`  📥 Fetching cards for ${user.userId}...`);
        const cards = await fetchUserCards(jwtData.token);
        console.log(`  📦 Found ${cards.length} cards`);
        
        // Salva ogni carta
        let cardsSaved = 0;
        for (const card of cards) {
          const request = convertToSaveCardRequest(card, user.userId);
          const saveResult = await saveUserCard(kv, request);
          if (saveResult.success) {
            cardsSaved++;
          } else {
            console.warn(`  ⚠️ Failed to save card ${card.slug}: ${saveResult.error}`);
          }
          
          // Piccolo delay tra salvataggi per rispettare rate limit KV
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Aggiorna timestamp ultima sincronizzazione
        await updateLastSync(kv, user.userId);

        result.totalCards += cardsSaved;
        result.usersProcessed++;
        result.details.push({ userId: user.userId, cardsSynced: cardsSaved });
        console.log(`  ✅ Saved ${cardsSaved}/${cards.length} cards`);

      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error processing ${user.userId}:`, msg);
        result.errors.push(`${user.userId}: ${msg}`);
        result.details.push({ userId: user.userId, cardsSynced: 0, error: msg });
      }
    }

    console.log("\n✅ Sync user cards complete:");
    console.log(`   Users processed: ${result.usersProcessed}`);
    console.log(`   Users skipped: ${result.usersSkipped}`);
    console.log(`   Total cards: ${result.totalCards}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Sync user cards failed:", msg);
    result.errors.push(`Fatal: ${msg}`);
    return result;
  }
}

/**
 * Sincronizza le carte di un singolo utente (on-demand)
 * Usato dall'endpoint /api/user/refresh-cards
 */
export async function syncSingleUserCards(
  kv: KVNamespace,
  userId: string,
  token: string
): Promise<{
  success: boolean;
  cardsFound: number;
  cardsSaved: number;
  error?: string;
}> {
  console.log(`🔄 [Sync Single User] Starting for ${userId}...`);

  try {
    // Scarica le carte
    const cards = await fetchUserCards(token);
    console.log(`📦 Found ${cards.length} cards for ${userId}`);

    // Salva ogni carta
    let cardsSaved = 0;
    for (const card of cards) {
      const request = convertToSaveCardRequest(card, userId);
      const saveResult = await saveUserCard(kv, request);
      if (saveResult.success) {
        cardsSaved++;
      } else {
        console.warn(`⚠️ Failed to save card ${card.slug}: ${saveResult.error}`);
      }
      
      // Piccolo delay tra salvataggi
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Aggiorna timestamp
    await updateLastSync(kv, userId);

    console.log(`✅ Saved ${cardsSaved}/${cards.length} cards for ${userId}`);
    
    return {
      success: true,
      cardsFound: cards.length,
      cardsSaved,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error syncing ${userId}:`, msg);
    return {
      success: false,
      cardsFound: 0,
      cardsSaved: 0,
      error: msg,
    };
  }
}
