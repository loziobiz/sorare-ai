/**
 * Analyze Odds Handler
 *
 * Eseguito da giovedì a domenica ogni 4 ore.
 * - Fetcha probabilità di titolarità e vittoria per ogni giocatore
 * - Non sovrascrive mai odds esistenti con valori nulli
 * - Aggiorna il campo stats.odds nel KV
 */

import type {
  NextFixtureOdds,
  OddsStats,
  PlayerRecord,
  StartingOdds,
  WinOdds,
} from "../lib/kv-repository.js";
import {
  DefaultUpdateStrategy,
  type KVPlayerRepository,
  loadAllPlayersForAnalysis,
} from "../lib/kv-repository.js";
import {
  GET_PLAYER_FALLBACK_STARTING_ODDS,
  GET_PLAYER_ODDS,
} from "../lib/queries.js";
import type { SorareWorkerClient } from "../lib/sorare-client.js";

interface GraphQLPlayerOdds {
  slug: string;
  displayName: string;
  activeClub: { name: string } | null;
  nextClassicFixtureProjectedScore: number | null;
  nextClassicFixturePlayingStatusOdds: {
    starterOddsBasisPoints: number;
  } | null;
  nextGame: {
    date: string;
    homeTeam: { name: string; code?: string };
    awayTeam: { name: string; code?: string };
    homeStats: {
      winOdds?: number | null;
      winOddsBasisPoints?: number;
      drawOddsBasisPoints?: number;
      loseOddsBasisPoints?: number;
    } | null;
    awayStats: {
      winOdds?: number | null;
      winOddsBasisPoints?: number;
      drawOddsBasisPoints?: number;
      loseOddsBasisPoints?: number;
    } | null;
  } | null;
}

interface GraphQLFallbackStartingOddsResponse {
  players: Array<{
    slug: string;
    nextGame: {
      playerGameScore: {
        projectedScore: number | null;
        footballPlayerGameStats: {
          footballPlayingStatusOdds: {
            starterOddsBasisPoints: number;
          } | null;
        } | null;
      } | null;
    } | null;
  }>;
}

interface GraphQLOddsResponse {
  players: GraphQLPlayerOdds[];
}

interface FallbackGameData {
  projectedScore: number | null;
  startingOdds: StartingOdds | null;
}

export interface AnalyzeOddsResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  withStartingOdds: number;
  withWinOdds: number;
}

const DELAY_MS = 50; // 50ms per processare velocemente ~900 giocatori entro i limiti HTTP

/**
 * Converte basis points in percentuale
 */
function basisPointsToPercentage(
  basisPoints: number | null | undefined
): number | null {
  if (basisPoints == null) {
    return null;
  }
  return Math.round(basisPoints / 100);
}

function floatOddsToBasisPoints(
  value: number | null | undefined
): number | null {
  if (value == null) {
    return null;
  }
  return Math.round(value * 10_000);
}

function extractTeamWinOdds(
  stats: {
    winOdds?: number | null;
    winOddsBasisPoints?: number;
    drawOddsBasisPoints?: number;
    loseOddsBasisPoints?: number;
  } | null
): WinOdds | null {
  if (!stats) {
    return null;
  }

  const winOddsBasisPoints =
    stats.winOddsBasisPoints ?? floatOddsToBasisPoints(stats.winOdds);
  const drawOddsBasisPoints = stats.drawOddsBasisPoints ?? null;
  const loseOddsBasisPoints = stats.loseOddsBasisPoints ?? null;

  if (
    winOddsBasisPoints == null &&
    drawOddsBasisPoints == null &&
    loseOddsBasisPoints == null
  ) {
    return null;
  }

  return {
    winOddsBasisPoints: winOddsBasisPoints ?? 0,
    drawOddsBasisPoints: drawOddsBasisPoints ?? 0,
    loseOddsBasisPoints: loseOddsBasisPoints ?? 0,
  };
}

/**
 * Sorare non popola sempre `nextClassicFixturePlayingStatusOdds`.
 */
function extractClassicStartingOdds(
  playerData: GraphQLPlayerOdds
): StartingOdds | null {
  const classicStartingOdds =
    playerData.nextClassicFixturePlayingStatusOdds?.starterOddsBasisPoints;
  if (classicStartingOdds != null) {
    return {
      starterOddsBasisPoints: classicStartingOdds,
    };
  }

  return null;
}

async function fetchFallbackStartingOdds(
  client: SorareWorkerClient,
  slug: string
): Promise<FallbackGameData | null> {
  try {
    const data = await client.query<GraphQLFallbackStartingOddsResponse>(
      GET_PLAYER_FALLBACK_STARTING_ODDS,
      {
        slug,
      }
    );
    const fallbackPlayerGameScore = data.players[0]?.nextGame?.playerGameScore;
    const fallbackStartingOdds =
      fallbackPlayerGameScore?.footballPlayerGameStats
        ?.footballPlayingStatusOdds?.starterOddsBasisPoints;
    const fallbackProjectedScore =
      fallbackPlayerGameScore?.projectedScore ?? null;

    if (fallbackStartingOdds == null && fallbackProjectedScore == null) {
      return null;
    }

    return {
      projectedScore: fallbackProjectedScore,
      startingOdds:
        fallbackStartingOdds == null
          ? null
          : {
              starterOddsBasisPoints: fallbackStartingOdds,
            },
    };
  } catch (error) {
    console.warn(`Error fetching fallback game data for ${slug}:`, error);
    return null;
  }
}

async function fetchFallbackStartingOddsMap(
  client: SorareWorkerClient,
  players: GraphQLPlayerOdds[]
): Promise<Map<string, FallbackGameData | null>> {
  const fallbackDataBySlug = new Map<string, FallbackGameData | null>();
  const playersNeedingFallback = players.filter(
    (playerData) =>
      (extractClassicStartingOdds(playerData) == null ||
        playerData.nextClassicFixtureProjectedScore == null) &&
      playerData.nextGame
  );

  for (const playerData of playersNeedingFallback) {
    fallbackDataBySlug.set(
      playerData.slug,
      await fetchFallbackStartingOdds(client, playerData.slug)
    );
  }

  return fallbackDataBySlug;
}

/**
 * Analizza odds per un batch di giocatori
 */
async function fetchPlayersOddsBatch(
  client: SorareWorkerClient,
  playersBatch: PlayerRecord[]
): Promise<Map<string, OddsStats | null>> {
  const resultMap = new Map<string, OddsStats | null>();
  const slugs = playersBatch.map((p) => p.slug);

  // Inizializza tutto a null
  for (const slug of slugs) {
    resultMap.set(slug, null);
  }

  try {
    const data = await client.query<GraphQLOddsResponse>(GET_PLAYER_ODDS, {
      slugs,
    });

    if (!data.players || data.players.length === 0) {
      return resultMap;
    }

    const fallbackGameDataBySlug = await fetchFallbackStartingOddsMap(
      client,
      data.players
    );

    // Crea un lookup per i player records usando lo slug
    const playerLookup = new Map(playersBatch.map((p) => [p.slug, p]));

    for (const playerData of data.players) {
      const record = playerLookup.get(playerData.slug);
      if (!record) {
        continue;
      }

      const clubName = playerData.activeClub?.name || record.clubName;

      // Estrai probabilità di titolarità
      const fallbackGameData = fallbackGameDataBySlug.get(playerData.slug);
      const startingOdds =
        extractClassicStartingOdds(playerData) ??
        fallbackGameData?.startingOdds ??
        null;
      const projectedScore =
        playerData.nextClassicFixtureProjectedScore ??
        fallbackGameData?.projectedScore ??
        null;

      // Estrai probabilità di vittoria
      let nextFixture: NextFixtureOdds | null = null;
      if (playerData.nextGame && clubName) {
        const game = playerData.nextGame;

        // Determina se il giocatore è in casa o in trasferta
        const isHome = game.homeTeam.name === clubName;
        const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
        const opponentCode = isHome ? game.awayTeam.code : game.homeTeam.code;

        // Prendi le probabilità della squadra corretta
        const teamWinOdds = isHome
          ? extractTeamWinOdds(game.homeStats)
          : extractTeamWinOdds(game.awayStats);

        nextFixture = {
          fixtureDate: game.date,
          opponent,
          opponentCode,
          isHome,
          startingOdds,
          teamWinOdds,
          projectedScore,
        };
      }

      resultMap.set(playerData.slug, {
        calculatedAt: new Date().toISOString(),
        nextFixture,
      });
    }

    return resultMap;
  } catch (error) {
    console.warn("Error fetching odds for batch:", error);
    return resultMap;
  }
}

/**
 * Formatta odds per display
 */
function formatOddsDisplay(odds: OddsStats | null): string {
  if (!odds?.nextFixture?.startingOdds) {
    return "No odds";
  }

  const { startingOdds, teamWinOdds, isHome, opponent } = odds.nextFixture;
  const starter = basisPointsToPercentage(startingOdds.starterOddsBasisPoints);

  let display = `Starter:${starter}%`;

  if (teamWinOdds) {
    const win = basisPointsToPercentage(teamWinOdds.winOddsBasisPoints);
    const location = isHome ? "vs" : "@";
    display += ` Win:${win}% ${location} ${opponent}`;
  }

  return display;
}

/**
 * Handler principale per analizzare odds
 */
export async function analyzeOddsHandler(
  repository: KVPlayerRepository,
  client: SorareWorkerClient
): Promise<AnalyzeOddsResult> {
  console.log("🎲 [Analyze Odds] Starting...");

  const result: AnalyzeOddsResult = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    withStartingOdds: 0,
    withWinOdds: 0,
  };

  try {
    // Carica tutti i giocatori (MLS + Extra) per l'analisi
    const kv = (repository as any).kv as KVNamespace;
    const players = await loadAllPlayersForAnalysis(kv, repository, {
      maxTotal: 1200,
    });

    console.log(`Found ${players.length} players to analyze`);

    // ============================================================
    // FASE 1: PULIZIA ODDS SCADUTE (su TUTTI i giocatori)
    // ============================================================
    console.log("\n🧹 Phase 1: Cleaning up expired odds...");
    const now = new Date();
    let cleanedCount = 0;
    let cleanErrors = 0;

    for (const player of players) {
      const existingOdds = player.stats?.odds?.nextFixture;
      if (existingOdds?.fixtureDate) {
        const existingDate = new Date(existingOdds.fixtureDate);
        if (existingDate < now) {
          console.log(
            `   🗑️ ${player.name}: Clearing expired odds (${existingOdds.fixtureDate})`
          );
          try {
            await repository.updatePlayerStats(
              player.slug,
              {
                odds: {
                  calculatedAt: now.toISOString(),
                  nextFixture: null,
                },
              },
              new DefaultUpdateStrategy()
            );
            cleanedCount++;
          } catch {
            console.error(`   ❌ Failed to clear odds for ${player.slug}:`);
            cleanErrors++;
          }
        }
      }
    }

    console.log(
      `✅ Cleanup complete: ${cleanedCount} cleared, ${cleanErrors} errors\n`
    );
    result.updated += cleanedCount;
    result.errors += cleanErrors;

    // ============================================================
    // FASE 2: FETCH NUOVE ODDS
    // ============================================================
    console.log("🎲 Phase 2: Fetching new odds...");

    // Processa in batch per evitare rate limits (max 1000 subrequests per worker)
    const BATCH_SIZE = 50;

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      console.log(
        `[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(players.length / BATCH_SIZE)}] Analyzing ${batch.length} players...`
      );

      const batchOddsMap = await fetchPlayersOddsBatch(client, batch);

      for (const player of batch) {
        const odds = batchOddsMap.get(player.slug);

        if (odds) {
          // --- CONTROLLO DATA EVENTO ---
          // Se l'evento è passato, cancella le odds invece di mantenerle
          const fixtureDate = odds.nextFixture?.fixtureDate;
          const isEventPassed = fixtureDate && new Date(fixtureDate) < now;

          if (isEventPassed) {
            console.log(
              `   🗑️ ${player.name}: Event passed (${fixtureDate}), clearing odds`
            );
            try {
              // Cancella le odds impostando nextFixture a null
              await repository.updatePlayerStats(
                player.slug,
                {
                  odds: {
                    calculatedAt: new Date().toISOString(),
                    nextFixture: null,
                  },
                },
                new DefaultUpdateStrategy()
              );
              result.updated++;
            } catch (err) {
              console.error(
                `   ❌ Failed to clear odds for ${player.slug}:`,
                err
              );
              result.errors++;
            }
            result.processed++;
            continue;
          }

          // --- LOGICA DI ESCLUSIONE (Risparmio scritture KV) ---
          const startingOddsBP =
            odds.nextFixture?.startingOdds?.starterOddsBasisPoints;
          const hasNextGame = !!odds.nextFixture?.fixtureDate;

          if (!startingOddsBP || startingOddsBP < 1000 || !hasNextGame) {
            result.skipped++;
            result.processed++;
            continue;
          }

          try {
            const strategy = new DefaultUpdateStrategy();

            const updated = await repository.updatePlayerStats(
              player.slug,
              { odds },
              strategy
            );

            if (updated) {
              result.updated++;
              console.log(`   ✅ ${player.name}: ${formatOddsDisplay(odds)}`);
            } else {
              result.skipped++;
            }

            if (odds.nextFixture?.startingOdds) {
              result.withStartingOdds++;
            }
            if (odds.nextFixture?.teamWinOdds) {
              result.withWinOdds++;
            }
          } catch (err) {
            console.error(`   ❌ Failed to update ${player.slug}:`, err);
            result.errors++;
          }
        } else {
          result.errors++;
        }

        result.processed++;
      }

      // Delay per rate limiting tra i batch
      if (i + BATCH_SIZE < players.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log("\n✅ Odds analysis complete:");
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped (preserved): ${result.skipped}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   With starting odds: ${result.withStartingOdds}`);
    console.log(`   With win odds: ${result.withWinOdds}`);

    return result;
  } catch (error) {
    console.error("Odds analysis failed:", error);
    return result;
  }
}
