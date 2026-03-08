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
import { GET_PLAYER_ODDS } from "../lib/queries.js";
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
      winOddsBasisPoints?: number;
      drawOddsBasisPoints?: number;
      loseOddsBasisPoints?: number;
    } | null;
    awayStats: {
      winOddsBasisPoints?: number;
      drawOddsBasisPoints?: number;
      loseOddsBasisPoints?: number;
    } | null;
  } | null;
}

interface GraphQLOddsResponse {
  players: GraphQLPlayerOdds[];
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
  if (basisPoints == null) return null;
  return Math.round(basisPoints / 100);
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

    // Crea un lookup per i player records usando lo slug
    const playerLookup = new Map(playersBatch.map((p) => [p.slug, p]));

    for (const playerData of data.players) {
      const record = playerLookup.get(playerData.slug);
      if (!record) continue;

      const clubName = playerData.activeClub?.name || record.clubName;

      // Estrai probabilità di titolarità
      let startingOdds: StartingOdds | null = null;
      if (playerData.nextClassicFixturePlayingStatusOdds) {
        startingOdds = {
          starterOddsBasisPoints:
            playerData.nextClassicFixturePlayingStatusOdds
              .starterOddsBasisPoints,
        };
      }

      // Estrai probabilità di vittoria
      let nextFixture: NextFixtureOdds | null = null;
      if (playerData.nextGame && clubName) {
        const game = playerData.nextGame;

        // Determina se il giocatore è in casa o in trasferta
        const isHome = game.homeTeam.name === clubName;
        const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
        const opponentCode = isHome ? game.awayTeam.code : game.homeTeam.code;

        // Prendi le probabilità della squadra corretta
        let teamWinOdds: WinOdds | null = null;
        if (isHome && game.homeStats) {
          teamWinOdds = {
            winOddsBasisPoints: game.homeStats.winOddsBasisPoints ?? 0,
            drawOddsBasisPoints: game.homeStats.drawOddsBasisPoints ?? 0,
            loseOddsBasisPoints: game.homeStats.loseOddsBasisPoints ?? 0,
          };
        } else if (!isHome && game.awayStats) {
          teamWinOdds = {
            winOddsBasisPoints: game.awayStats.winOddsBasisPoints ?? 0,
            drawOddsBasisPoints: game.awayStats.drawOddsBasisPoints ?? 0,
            loseOddsBasisPoints: game.awayStats.loseOddsBasisPoints ?? 0,
          };
        }

        nextFixture = {
          fixtureDate: game.date,
          opponent,
          opponentCode,
          isHome,
          startingOdds,
          teamWinOdds,
          projectedScore: playerData.nextClassicFixtureProjectedScore,
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
