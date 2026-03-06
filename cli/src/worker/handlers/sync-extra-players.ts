/**
 * Sync Extra Players Handler
 *
 * Eseguito dopo extract-players (martedì).
 * - Recupera la lista dei giocatori extra da sincronizzare (salvati dalle carte utente)
 * - Fetcha i dati base da Sorare API (slug, nome, club, posizione)
 * - Salva nel KV con flag isExtra: true
 * - Marca come sincronizzato
 *
 * Rate limit: ~1 query/sec (60/min) per rispettare limiti Sorare
 */

import {
  type KVPlayerRepository,
  addExtraPlayerSlug,
  getExtraPlayerSlugs,
  markExtraPlayerSlugsAsSynced,
} from "../lib/kv-repository.js";
import type { SorareWorkerClient } from "../lib/sorare-client.js";

// Query per ottenere dati base di un singolo giocatore
const GET_PLAYER_BASIC_INFO = `
  query GetPlayerBasicInfo($slug: String!) {
    football {
      player(slug: $slug) {
        ... on Player {
          slug
          displayName
          anyPositions
          activeClub {
            slug
            name
            code
          }
        }
      }
    }
  }
`;

interface GraphQLPlayerBasicInfo {
  football: {
    player: {
      slug: string;
      displayName: string;
      anyPositions: string[];
      activeClub: {
        slug: string;
        name: string;
        code?: string;
      } | null;
    } | null;
  } | null;
}

export interface SyncExtraPlayersResult {
  queueSize: number;
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
}

const DELAY_MS = 1000; // 1 secondo tra le query = 60/min

/**
 * Fetch dati base di un giocatore da Sorare
 */
async function fetchPlayerBasicInfo(
  client: SorareWorkerClient,
  slug: string
): Promise<{
  slug: string;
  name: string;
  clubSlug: string;
  clubName: string;
  clubCode: string;
  position: string;
} | null> {
  try {
    const data = await client.query<GraphQLPlayerBasicInfo>(GET_PLAYER_BASIC_INFO, {
      slug,
    });

    const player = data?.football?.player;
    if (!player) {
      console.warn(`[SyncExtra] Player not found in Sorare: ${slug}`);
      return null;
    }

    if (!player.activeClub) {
      console.warn(`[SyncExtra] Player has no active club: ${slug}`);
      return null;
    }

    return {
      slug: player.slug,
      name: player.displayName,
      clubSlug: player.activeClub.slug,
      clubName: player.activeClub.name,
      clubCode: player.activeClub.code || "UNK",
      position: player.anyPositions?.[0] || "Unknown",
    };
  } catch (error) {
    console.error(`[SyncExtra] Error fetching ${slug}:`, error);
    return null;
  }
}

/**
 * Handler principale per sincronizzare giocatori extra
 */
export async function syncExtraPlayersHandler(
  repository: KVPlayerRepository,
  client: SorareWorkerClient
): Promise<SyncExtraPlayersResult> {
  console.log("🌐 [Sync Extra Players] Starting...");

  const result: SyncExtraPlayersResult = {
    queueSize: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // 1. Ottieni la lista dei giocatori da sincronizzare
    const kv = (repository as any).kv as KVNamespace;
    const slugsToSync = await getExtraPlayerSlugs(kv);

    result.queueSize = slugsToSync.length;
    console.log(`Found ${slugsToSync.length} extra players to sync`);

    if (slugsToSync.length === 0) {
      console.log("No extra players to sync");
      return result;
    }

    const syncedSlugs: string[] = [];
    const failedSlugs: string[] = [];

    // 2. Processa ogni giocatore
    for (let i = 0; i < slugsToSync.length; i++) {
      const slug = slugsToSync[i];
      console.log(`[${i + 1}/${slugsToSync.length}] Syncing ${slug}...`);

      // Verifica se esiste già (potrebbe essere stato aggiunto manualmente o da extract-players)
      const existing = await repository.findBySlug(slug);
      if (existing) {
        console.log(`  ⏭️ Already exists: ${slug}`);
        syncedSlugs.push(slug);
        result.skipped++;
        continue;
      }

      // Fetch dati da Sorare
      const playerData = await fetchPlayerBasicInfo(client, slug);

      if (playerData) {
        try {
          // Salva nel KV
          const added = await repository.addPlayer({
            slug: playerData.slug,
            name: playerData.name,
            clubSlug: playerData.clubSlug,
            clubName: playerData.clubName,
            clubCode: playerData.clubCode,
            position: playerData.position,
            isExtra: true, // Flag per identificare giocatori extra-MLS
          });

          if (added) {
            console.log(`  ✅ Synced: ${playerData.name} (${playerData.clubName})`);
            syncedSlugs.push(slug);
            result.synced++;
          } else {
            console.log(`  ⏭️ Already exists (race condition): ${slug}`);
            syncedSlugs.push(slug);
            result.skipped++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  ❌ Failed to save ${slug}: ${msg}`);
          failedSlugs.push(slug);
          result.failed++;
          result.errors.push(`${slug}: ${msg}`);
        }
      } else {
        // Player non trovato in Sorare - potrebbe essere:
        // 1. Un giocatore ritirato/cancellato
        // 2. Un errore temporaneo API
        // 3. Uno slug errato
        // Lo marchiamo come synced per non riprovare all'infinito,
        // ma lo teniamo traccia come failed
        console.warn(`  ⚠️ Not found in Sorare, skipping: ${slug}`);
        syncedSlugs.push(slug); // Per rimuoverlo dalla coda
        result.failed++;
        result.errors.push(`${slug}: Not found in Sorare`);
      }

      // Delay per rispettare rate limit
      if (i < slugsToSync.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    // 3. Marca tutti come sincronizzati (anche i failed, per non riprovare all'infinito)
    // I failed possono essere reinseriti manualmente se necessario
    if (syncedSlugs.length > 0) {
      await markExtraPlayerSlugsAsSynced(kv, syncedSlugs);
    }

    console.log("\n✅ Sync extra players complete:");
    console.log(`   Queue size: ${result.queueSize}`);
    console.log(`   Synced: ${result.synced}`);
    console.log(`   Skipped (already exists): ${result.skipped}`);
    console.log(`   Failed: ${result.failed}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(err);
    console.error("Sync extra players failed:", msg);
    result.errors.push(`Fatal: ${msg}`);
    return result;
  }
}
