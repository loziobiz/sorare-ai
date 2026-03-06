/**
 * Analyze All-Around (AA) Handler
 *
 * Eseguito ogni mercoledì mattina (dopo home/away).
 * - Calcola AA5, AA15, AA25 per ogni giocatore
 * - Aggiorna il campo stats.aaAnalysis nel KV
 */

import type { AAStats, PlayerRecord } from "../lib/kv-repository.js";
import {
  DefaultUpdateStrategy,
  type KVPlayerRepository,
  loadAllPlayersForAnalysis,
} from "../lib/kv-repository.js";
import { GET_PLAYER_AA_SCORES } from "../lib/queries.js";
import type { SorareWorkerClient } from "../lib/sorare-client.js";

interface AAGameScore {
  allAroundScore: number;
  scoreStatus: string;
}

export interface AnalyzeAAResult {
  processed: number;
  updated: number;
  errors: number;
  byPosition: Record<string, { count: number; avgAA5: number }>;
}

const DELAY_MS = 100; // 100ms tra le query individuali per rispettare rate limit
const CONCURRENCY = 5; // Numero di query parallele

interface GraphQLPlayerAASingle {
  football: {
    player: {
      slug: string;
      allPlayerGameScores: {
        edges: Array<{ node: AAGameScore }>;
      };
    };
  };
}

/**
 * Recupera AA per un singolo giocatore
 */
async function fetchPlayerAA(
  client: SorareWorkerClient,
  slug: string
): Promise<AAStats | null> {
  try {
    const data = await client.query<GraphQLPlayerAASingle>(
      GET_PLAYER_AA_SCORES,
      {
        slug,
        last: 25,
      }
    );

    if (!data.football?.player) return null;

    const playerData = data.football.player;
    const scores = playerData.allPlayerGameScores.edges.map(
      (edge) => edge.node
    );

    // Filtra score validi (!= 0, escludendo DID_NOT_PLAY)
    const validAAScores = scores
      .filter(
        (score) =>
          score.allAroundScore !== 0 && score.scoreStatus !== "DID_NOT_PLAY"
      )
      .map((score) => score.allAroundScore);

    // Calcola medie per diversi span
    const AA5 =
      validAAScores.length >= 5
        ? Number(
            (validAAScores.slice(0, 5).reduce((a, b) => a + b, 0) / 5).toFixed(
              2
            )
          )
        : null;

    const AA15 =
      validAAScores.length >= 15
        ? Number(
            (
              validAAScores.slice(0, 15).reduce((a, b) => a + b, 0) / 15
            ).toFixed(2)
          )
        : null;

    const AA25 =
      validAAScores.length >= 25
        ? Number(
            (
              validAAScores.reduce((a, b) => a + b, 0) / validAAScores.length
            ).toFixed(2)
          )
        : null;

    return {
      calculatedAt: new Date().toISOString(),
      gamesAnalyzed: scores.length,
      AA5,
      AA15,
      AA25,
      validScores: validAAScores,
    };
  } catch (error) {
    console.warn(`Error fetching AA for ${slug}:`, error);
    return null;
  }
}

/**
 * Analizza AA per un batch di giocatori (query individuali parallele)
 */
async function fetchPlayersAABatch(
  client: SorareWorkerClient,
  playersBatch: PlayerRecord[]
): Promise<Map<string, AAStats | null>> {
  const resultMap = new Map<string, AAStats | null>();

  // Processa in parallelo con concorrenza limitata
  for (let i = 0; i < playersBatch.length; i += CONCURRENCY) {
    const batch = playersBatch.slice(i, i + CONCURRENCY);

    const promises = batch.map(async (player) => {
      const aaStats = await fetchPlayerAA(client, player.slug);
      resultMap.set(player.slug, aaStats);
    });

    await Promise.all(promises);

    // Delay tra i batch per rispettare rate limit
    if (i + CONCURRENCY < playersBatch.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return resultMap;
}

/**
 * Handler principale per analizzare AA
 */
export async function analyzeAAHandler(
  repository: KVPlayerRepository,
  client: SorareWorkerClient
): Promise<AnalyzeAAResult> {
  console.log("📊 [Analyze AA] Starting...");

  const result: AnalyzeAAResult = {
    processed: 0,
    updated: 0,
    errors: 0,
    byPosition: {},
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

      const batchAAMap = await fetchPlayersAABatch(client, batch);

      for (const player of batch) {
        const aaStats = batchAAMap.get(player.slug);

        if (aaStats) {
          const strategy = new DefaultUpdateStrategy();

          try {
            console.log(
              `   💾 Saving AA for ${player.slug}: AA5=${aaStats.AA5}, AA15=${aaStats.AA15}, AA25=${aaStats.AA25}`
            );
            const updated = await repository.updatePlayerStats(
              player.slug,
              { aaAnalysis: aaStats },
              strategy
            );

            if (updated) {
              console.log(`   ✅ Updated ${player.slug}`);
              result.updated++;
            } else {
              console.log(`   ⚠️ No changes for ${player.slug}`);
            }

            // Traccia stats per posizione
            const pos = player.position || "Unknown";
            if (!result.byPosition[pos]) {
              result.byPosition[pos] = { count: 0, avgAA5: 0 };
            }
            if (aaStats.AA5 !== null) {
              result.byPosition[pos].count++;
              result.byPosition[pos].avgAA5 += aaStats.AA5;
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

    // Calcola medie per posizione
    for (const pos of Object.keys(result.byPosition)) {
      const data = result.byPosition[pos];
      if (data.count > 0) {
        data.avgAA5 = Number((data.avgAA5 / data.count).toFixed(2));
      }
    }

    console.log("\n✅ AA analysis complete:");
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error("AA analysis failed:", error);
    return result;
  }
}
