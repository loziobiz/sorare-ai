/**
 * Update Player Stats Handler
 *
 * Eseguito come fase 3 del cron del mercoledì, dopo extract-players e sync-extra-players.
 * Aggiorna l10Average (LAST_TEN_PLAYED_SO5_AVERAGE_SCORE) per TUTTI i giocatori in KV.
 */

import {
  DefaultUpdateStrategy,
  type KVPlayerRepository,
} from "../lib/kv-repository.js";
import { GET_PLAYERS_STATS } from "../lib/queries.js";
import type { SorareWorkerClient } from "../lib/sorare-client.js";

interface GraphQLPlayerStats {
  slug: string;
  averageScore: number | null;
}

interface GraphQLPlayersStatsResponse {
  players: GraphQLPlayerStats[];
}

export interface UpdatePlayerStatsResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
}

const BATCH_SIZE = 100;
const DELAY_MS = 100;

/**
 * Handler principale per aggiornare le statistiche L10 di tutti i giocatori
 */
export async function updatePlayerStatsHandler(
  repository: KVPlayerRepository,
  client: SorareWorkerClient
): Promise<UpdatePlayerStatsResult> {
  console.log("📊 [Update Player Stats] Starting...");

  const result: UpdatePlayerStatsResult = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Carica tutti gli slug dal KV (senza filtrare per carte utente)
    const keysMap = await repository.getKeysAndMetadata();
    const allSlugs = Array.from(keysMap.keys());

    console.log(`Found ${allSlugs.length} players to update`);

    for (let i = 0; i < allSlugs.length; i += BATCH_SIZE) {
      const batchSlugs = allSlugs.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allSlugs.length / BATCH_SIZE);

      console.log(
        `[Batch ${batchNum}/${totalBatches}] Fetching stats for ${batchSlugs.length} players...`
      );

      try {
        const data = await client.query<GraphQLPlayersStatsResponse>(
          GET_PLAYERS_STATS,
          { slugs: batchSlugs }
        );

        if (!data.players || data.players.length === 0) {
          result.skipped += batchSlugs.length;
          result.processed += batchSlugs.length;
          continue;
        }

        // Crea lookup per risultati
        const statsMap = new Map<string, number | null>();
        for (const player of data.players) {
          statsMap.set(player.slug, player.averageScore ?? null);
        }

        for (const slug of batchSlugs) {
          const l10Average = statsMap.get(slug) ?? null;

          if (l10Average == null) {
            result.skipped++;
          } else {
            try {
              await repository.updatePlayer(
                slug,
                { l10Average },
                new DefaultUpdateStrategy()
              );
              result.updated++;
            } catch {
              result.errors++;
            }
          }

          result.processed++;
        }
      } catch (error) {
        console.warn(`Error fetching stats for batch ${batchNum}:`, error);
        result.errors += batchSlugs.length;
        result.processed += batchSlugs.length;
      }

      // Delay tra batch
      if (i + BATCH_SIZE < allSlugs.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log("\n✅ Player stats update complete:");
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error("Player stats update failed:", error);
    return result;
  }
}
