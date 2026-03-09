/**
 * Sync User Cards Handler
 *
 * Eseguito periodicamente (cron settimanale).
 * - Legge tutti gli utenti con JWT salvato
 * - Per ogni utente con token valido, scarica le carte da Sorare
 * - Salva le carte nel KV usando la stessa struttura del client
 */

import { invalidateUserCache } from "../index.js";
import { SorareWorkerClient } from "../lib/sorare-client.js";
import { extractCorrectPlayerSlug, saveUserCard } from "./user-cards.js";
import { getUserJWT, listUsersWithJWT, updateLastSync } from "./user-jwt.js";

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
          rarityTyped
          serialNumber
          pictureUrl
          inSeasonEligible
          power
          powerBreakdown {
            xp
            season
          }
          cardPrice
          lowestPriceCard {
            slug
            cardPrice
          }
          anyPositions
          ... on Card {
            sealed
            l5Average: averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)
            l10Average: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
            l15Average: averageScore(type: LAST_FIFTEEN_SO5_AVERAGE_SCORE)
            l40Average: averageScore(type: LAST_FORTY_SO5_AVERAGE_SCORE)
            player {
              slug
              displayName
              activeClub {
                slug
                name
                code
                domesticLeague {
                  name
                }
              }
            }
            so5Scores(last: 10) {
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
            ownershipHistory {
              transferType
              from
              amounts {
                eurCents
                referenceCurrency
              }
            }
          }
        }
      }
    }
  }
`;

interface SorareCard {
  slug: string;
  name: string;
  rarityTyped: string;
  serialNumber: number;
  pictureUrl?: string;
  inSeasonEligible?: boolean;
  power?: string;
  powerBreakdown?: { xp?: string; season?: string };
  cardPrice?: number | null;
  lowestPriceCard?: { slug: string; cardPrice?: number | null } | null;
  anyPositions?: string[];
  sealed?: boolean;
  l5Average?: number | null;
  l10Average?: number | null;
  l15Average?: number | null;
  l40Average?: number | null;
  player?: {
    slug: string;
    displayName: string;
    activeClub?: {
      slug: string;
      name: string;
      code?: string;
      domesticLeague?: {
        name: string;
      } | null;
    } | null;
  };
  so5Scores?: Array<{
    score: number;
    projectedScore: number;
    scoreStatus: string;
    game?: {
      date: string;
      homeTeam: { name: string };
      awayTeam: { name: string };
    };
  }>;
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
async function fetchUserCards(token: string): Promise<SorareCard[]> {
  const cards: SorareCard[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  // Crea un client temporaneo con il token dell'utente specifico
  const userClient = new SorareWorkerClient({
    jwtToken: token,
    jwtAud: "sorare-ai",
  });

  while (hasNextPage) {
    try {
      console.log(`  📄 Fetching page ${pageCount + 1}...`);

      // Timeout di 30 secondi per pagina
      const fetchPromise = userClient.query<UserCardsResponse>(GET_USER_CARDS, {
        cursor,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout: GraphQL query took too long")),
          30_000
        )
      );
      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (!data.currentUser) {
        console.warn("[SyncCards] No currentUser in response");
        break;
      }

      const pageCards = data.currentUser.cards.nodes;
      console.log(`  ✅ Got ${pageCards.length} cards`);
      cards.push(...pageCards);

      hasNextPage = data.currentUser.cards.pageInfo.hasNextPage;
      cursor = data.currentUser.cards.pageInfo.endCursor;
      pageCount++;

      console.log(
        `  📊 Total: ${cards.length} cards, hasNextPage: ${hasNextPage}, cursor: ${cursor}`
      );

      // Delay tra pagine per rispettare rate limit
      if (hasNextPage) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("[SyncCards] Error fetching cards:", error);
      throw error;
    }
  }

  // Filtra solo LIMITED e RARE, e escludi carte SEALED (come nel client web)
  const allowedRarities = ["limited", "rare"];
  const filteredCards = cards.filter((c) => {
    const rarity = c.rarityTyped?.toLowerCase();
    const isAllowedRarity = allowedRarities.includes(rarity);
    const isSealed = c.sealed === true;

    if (!isAllowedRarity) {
      console.log(`  ⛔ Filtering out: ${c.slug} (rarity: ${c.rarityTyped})`);
      return false;
    }
    if (isSealed) {
      console.log(`  🔒 Filtering out: ${c.slug} (sealed)`);
      return false;
    }
    return true;
  });
  console.log(
    `📊 Filtered: ${filteredCards.length}/${cards.length} cards (limited/rare, not sealed)`
  );
  return filteredCards;
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
} | null {
  // Salta carte senza player (es. offerte in vendita, non carte possedute)
  if (!card.player) {
    console.log(`  ⚠️ Skipping card ${card.slug}: no player data`);
    return null;
  }

  const clubCode = card.player.activeClub?.code || "UNK";

  // Estrai lo slug corretto del giocatore
  const correctPlayerSlug = extractCorrectPlayerSlug(
    card.slug,
    card.player.slug
  );

  return {
    userId,
    clubCode,
    playerSlug: correctPlayerSlug,
    cardData: {
      slug: card.slug,
      name: card.name,
      rarityTyped: card.rarityTyped,
      serialNumber: card.serialNumber,
      pictureUrl: card.pictureUrl,
      inSeasonEligible: card.inSeasonEligible,
      sealed: false,
      l5Average: card.l5Average,
      l10Average: card.l10Average,
      l15Average: card.l15Average,
      l40Average: card.l40Average,
      power: card.power,
      powerBreakdown: card.powerBreakdown,
      cardPrice: card.cardPrice,
      lowestPriceCard: card.lowestPriceCard,
      anyPositions: card.anyPositions || [],
      playerSlug: correctPlayerSlug,
      clubName: card.player.activeClub?.name,
      leagueName: card.player.activeClub?.domesticLeague?.name,
      player: {
        slug: card.player.slug,
        displayName: card.player.displayName,
      },
      so5Scores:
        card.so5Scores?.map((s) => ({
          score: s.score,
          projectedScore: s.projectedScore,
          scoreStatus: s.scoreStatus,
          game: s.game,
        })) || [],
      ownershipHistory: card.ownershipHistory || [],
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
      console.log(
        `[${result.usersProcessed + 1}/${validUsers.length}] Processing ${user.userId}...`
      );

      try {
        // Recupera il JWT decifrato
        const jwtData = await getUserJWT(kv, user.userId);
        if (!jwtData) {
          console.log(`  ⏭️ Token not available for ${user.userId}`);
          result.usersSkipped++;
          result.details.push({
            userId: user.userId,
            cardsSynced: 0,
            error: "Token not available",
          });
          continue;
        }

        // Cleanup: cancella vecchie carte dell'utente
        const deleted = await cleanupUserCards(kv, user.userId);
        console.log(`  🗑️ Cleaned up ${deleted} old cards`);

        // Scarica le carte usando il token specifico dell'utente
        console.log(`  📥 Fetching cards for ${user.userId}...`);
        const cards = await fetchUserCards(jwtData.token);
        console.log(`  📦 Found ${cards.length} cards`);

        // Salva le carte con limitazione concorrenza (max 5 parallelo)
        let cardsSaved = 0;
        const concurrency = 5;

        for (let i = 0; i < cards.length; i += concurrency) {
          const batch = cards.slice(i, i + concurrency);

          const results = await Promise.all(
            batch.map(async (card) => {
              const request = convertToSaveCardRequest(card, user.userId);
              if (!request) return { success: false, skipped: true };
              return saveUserCard(kv, request);
            })
          );

          cardsSaved += results.filter((r) => r.success).length;

          // Delay tra batch per rate limit KV
          if (i + concurrency < cards.length) {
            await new Promise((r) => setTimeout(r, 100));
          }
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
        result.details.push({
          userId: user.userId,
          cardsSynced: 0,
          error: msg,
        });
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
 * Cancella tutte le carte di un utente da KV (cleanup prima di sync)
 */
async function cleanupUserCards(
  kv: KVNamespace,
  userId: string
): Promise<number> {
  const prefix = `USR_${userId}:`;
  let deleted = 0;
  let cursor: string | undefined;

  do {
    const listResult = await kv.list({ prefix, cursor, limit: 1000 });
    for (const key of listResult.keys) {
      await kv.delete(key.name);
      deleted++;
    }
    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

  return deleted;
}

/**
 * Estrae lo userId dal JWT token (payload.sub)
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
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

  // Verifica che il token corrisponda allo userId
  const tokenUserId = extractUserIdFromToken(token);
  console.log(`🔐 Token userId: ${tokenUserId}, Request userId: ${userId}`);

  if (tokenUserId && tokenUserId !== userId) {
    console.warn(
      `⚠️ MISMATCH! Token belongs to ${tokenUserId} but saving as ${userId}`
    );
  }

  try {
    // Cleanup: cancella vecchie carte dell'utente
    const deleted = await cleanupUserCards(kv, userId);
    console.log(`🗑️ Cleaned up ${deleted} old cards for ${userId}`);

    // Scarica le carte
    const cards = await fetchUserCards(token);
    console.log(`📦 Found ${cards.length} cards for ${userId}`);

    // Salva le carte con limitazione concorrenza (max 5 parallelo per rispettare limiti KV)
    let cardsSaved = 0;
    const concurrency = 5;

    console.log(
      `💾 Saving ${cards.length} cards with max ${concurrency} concurrent...`
    );

    for (let i = 0; i < cards.length; i += concurrency) {
      const batch = cards.slice(i, i + concurrency);

      // Processa batch con limitata concorrenza
      const results = await Promise.all(
        batch.map(async (card) => {
          const request = convertToSaveCardRequest(card, userId);
          if (!request) return { success: false, skipped: true };
          return saveUserCard(kv, request);
        })
      );

      // Conta i successi
      const batchSaved = results.filter((r) => r.success).length;
      cardsSaved += batchSaved;

      // Piccolo delay tra batch per rispettare rate limit KV
      if (i + concurrency < cards.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`✅ Total saved: ${cardsSaved}/${cards.length} cards`);

    // Aggiorna timestamp
    await updateLastSync(kv, userId);

    // Invalida cache per forzare refresh dei dati
    console.log(`🗑️ Invalidating cache for ${userId}...`);
    const invalidatedUrls = await invalidateUserCache(kv, userId);
    console.log(`✅ Cache invalidated: ${invalidatedUrls.join(", ")}`);

    console.log(
      `✅ Total saved: ${cardsSaved}/${cards.length} cards for ${userId}`
    );

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
