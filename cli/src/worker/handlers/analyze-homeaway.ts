/**
 * Analyze Home/Away Handler
 *
 * Eseguito ogni mercoledì mattina.
 * - Analizza le performance home/away per tutti i giocatori
 * - Calcola home advantage factor
 * - Aggiorna il campo stats.homeAwayAnalysis nel KV
 */

import type { HomeAwayStats, PlayerRecord } from "../lib/kv-repository.js";
import {
  DefaultUpdateStrategy,
  type KVPlayerRepository,
  loadAllPlayersForAnalysis,
} from "../lib/kv-repository.js";
import { GET_PLAYERS_GAME_SCORES } from "../lib/queries.js";
import type { SorareWorkerClient } from "../lib/sorare-client.js";

interface GameScore {
  score: number;
  scoreStatus: string;
  anyGame: {
    date: string;
    homeTeam: { name: string };
    awayTeam: { name: string };
  };
}

interface GraphQLPlayerHomeAway {
  slug: string;
  displayName: string;
  activeClub: { name: string } | null;
  allPlayerGameScores: {
    edges: Array<{ node: GameScore }>;
  };
}

interface GraphQLHomeAwayResponse {
  players: GraphQLPlayerHomeAway[];
}

export interface AnalyzeHomeAwayResult {
  processed: number;
  updated: number;
  errors: number;
  details: Array<{
    slug: string;
    name: string;
    homeGames: number;
    awayGames: number;
    homeAvg: number;
    awayAvg: number;
    haFactor: number;
  }>;
}

const GAMES_COUNT = 50;
const DELAY_MS = 50; // 50ms per processare velocemente ~900 giocatori entro i limiti HTTP

/**
 * Analizza home/away per un batch di giocatori
 */
async function fetchPlayersHomeAwayBatch(
  client: SorareWorkerClient,
  playersBatch: PlayerRecord[]
): Promise<Map<string, HomeAwayStats | null>> {
  const resultMap = new Map<string, HomeAwayStats | null>();
  const slugs = playersBatch.map((p) => p.slug);

  for (const slug of slugs) resultMap.set(slug, null);

  try {
    const data = await client.query<GraphQLHomeAwayResponse>(
      GET_PLAYERS_GAME_SCORES,
      {
        slugs,
        last: GAMES_COUNT,
      }
    );

    if (!data.players) return resultMap;

    // Crea un lookup per i player records usando lo slug per avere il clubName di fallback
    const playerLookup = new Map(playersBatch.map((p) => [p.slug, p]));

    for (const playerData of data.players) {
      const record = playerLookup.get(playerData.slug);
      if (!record) continue;

      const clubName = playerData.activeClub?.name || record.clubName;
      const scores =
        playerData.allPlayerGameScores?.edges?.map((e) => e.node) || [];

      const homeScores: number[] = [];
      const awayScores: number[] = [];

      for (const score of scores) {
        if (!score?.anyGame) continue;
        if (score.score <= 0) continue;

        const isHome = score.anyGame.homeTeam?.name === clubName;
        const isAway = score.anyGame.awayTeam?.name === clubName;

        if (isHome) homeScores.push(score.score);
        else if (isAway) awayScores.push(score.score);
      }

      const homeAverage =
        homeScores.length > 0
          ? homeScores.reduce((a, b) => a + b, 0) / homeScores.length
          : 0;
      const awayAverage =
        awayScores.length > 0
          ? awayScores.reduce((a, b) => a + b, 0) / awayScores.length
          : 0;
      const homeAdvantageFactor =
        awayAverage > 0 ? (homeAverage - awayAverage) / awayAverage : 0;

      resultMap.set(playerData.slug, {
        calculatedAt: new Date().toISOString(),
        gamesAnalyzed: scores.length,
        home: {
          games: homeScores.length,
          average: Number(homeAverage.toFixed(2)),
        },
        away: {
          games: awayScores.length,
          average: Number(awayAverage.toFixed(2)),
        },
        homeAdvantageFactor: Number(homeAdvantageFactor.toFixed(4)),
      });
    }

    return resultMap;
  } catch (error) {
    console.warn("Error fetching HomeAway batch:", error);
    return resultMap;
  }
}

/**
 * Handler principale per analizzare home/away
 */
export async function analyzeHomeAwayHandler(
  repository: KVPlayerRepository,
  client: SorareWorkerClient
): Promise<AnalyzeHomeAwayResult> {
  console.log("🏠 [Analyze Home/Away] Starting...");

  const result: AnalyzeHomeAwayResult = {
    processed: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  try {
    // Carica tutti i giocatori (MLS + Extra) per l'analisi
    const kv = (repository as any).kv as KVNamespace;
    const players = await loadAllPlayersForAnalysis(kv, repository, {
      maxTotal: 1200,
    });

    console.log(`Found ${players.length} players to analyze`);

    const BATCH_SIZE = 50;
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      console.log(
        `[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(players.length / BATCH_SIZE)}] Analyzing ${batch.length} players...`
      );

      const batchHomeAwayMap = await fetchPlayersHomeAwayBatch(client, batch);

      for (const player of batch) {
        const stats = batchHomeAwayMap.get(player.slug);

        if (stats) {
          const strategy = new DefaultUpdateStrategy();

          try {
            const updated = await repository.updatePlayerStats(
              player.slug,
              { homeAwayAnalysis: stats },
              strategy
            );

            if (updated) {
              result.updated++;
            }

            result.details.push({
              slug: player.slug,
              name: player.name,
              homeGames: stats.home.games,
              awayGames: stats.away.games,
              homeAvg: stats.home.average,
              awayAvg: stats.away.average,
              haFactor: stats.homeAdvantageFactor,
            });
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

    console.log("\n✅ Home/Away analysis complete:");
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error("Home/Away analysis failed:", error);
    return result;
  }
}
