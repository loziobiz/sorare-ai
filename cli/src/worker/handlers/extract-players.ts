/**
 * Extract Players Handler
 * 
 * Eseguito ogni martedì mattina.
 * - Fetcha tutti i club MLS e i loro giocatori
 * - Aggiunge nuovi giocatori al KV se non esistono
 * - Aggiorna dati esistenti se cambiati (club, nome, posizione)
 * - Non elimina giocatori (operazione manuale se necessario)
 */

import { KVPlayerRepository } from "../lib/kv-repository.js";
import { SorareWorkerClient } from "../lib/sorare-client.js";
import { GET_MLS_COMPETITION, GET_CLUB_PLAYERS } from "../lib/queries.js";
import type { PlayerRecord } from "../lib/kv-repository.js";

interface GraphQLPlayer {
  slug: string;
  displayName: string;
  anyPositions: string[];
  activeClub: {
    slug: string;
    name: string;
    code?: string;
  } | null;
}

interface GraphQLClub {
  slug: string;
  name: string;
  code?: string;
  activePlayers?: {
    edges: {
      node: GraphQLPlayer;
    }[];
  };
}

interface CompetitionData {
  football: {
    competition: {
      slug: string;
      name: string;
      clubs: {
        edges: {
          node: GraphQLClub;
        }[];
      };
    };
  };
}

interface ClubData {
  football: {
    club: GraphQLClub;
  };
}

export interface ExtractPlayersResult {
  added: number;
  updated: number;
  unchanged: number;
  total: number;
  errors: string[];
}

/**
 * Handler principale per estrarre giocatori MLS
 */
export async function extractPlayersHandler(
  repository: KVPlayerRepository,
  client: SorareWorkerClient
): Promise<ExtractPlayersResult> {
  console.log("🔍 [Extract Players] Starting...");

  const result: ExtractPlayersResult = {
    added: 0,
    updated: 0,
    unchanged: 0,
    total: 0,
    errors: [],
  };

  try {
    // 1. Fetch competition e clubs
    console.log("Fetching MLS competition...");
    const compData = await client.query<CompetitionData>(GET_MLS_COMPETITION);

    if (!compData.football?.competition) {
      throw new Error("MLS competition not found");
    }

    const clubEdges = compData.football.competition.clubs.edges;
    console.log(`Found ${clubEdges.length} clubs`);

    // 2. Fetch giocatori per ogni club
    const allClubs: GraphQLClub[] = [];

    for (let i = 0; i < clubEdges.length; i++) {
      const clubNode = clubEdges[i].node;
      console.log(`[${i + 1}/${clubEdges.length}] Fetching ${clubNode.name}...`);

      // Retry con exponential backoff
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          const clubData = await client.query<ClubData>(GET_CLUB_PLAYERS, {
            slug: clubNode.slug,
          });

          if (clubData.football?.club) {
            allClubs.push(clubData.football.club);
            success = true;
            console.log(`  ✅ ${clubNode.name}: ${clubData.football.club.activePlayers?.edges.length || 0} players`);
          }
        } catch (err) {
          retries--;
          if (retries > 0) {
            const delay = (4 - retries) * 1000; // 1s, 2s, 3s
            console.warn(`  ⚠️ Retry ${clubNode.name} in ${delay}ms... (${retries} left)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`  ❌ Failed to fetch ${clubNode.name}: ${msg}`);
            result.errors.push(`${clubNode.name}: ${msg}`);
          }
        }
      }

      // Delay tra club (50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(`Successfully fetched ${allClubs.length} clubs`);

    // 3. Pre-fetch di tutte le chiavi esistenti e metadati per evitare rate limits
    console.log("Pre-fetching existing KV keys and metadata...");
    const existingKeysMap = await repository.getKeysAndMetadata();
    console.log(`Found ${existingKeysMap.size} existing players in KV`);

    // 4. Processa giocatori
    const seenSlugs = new Set<string>();

    for (const club of allClubs) {
      for (const edge of club.activePlayers?.edges || []) {
        const player = edge.node;

        // Salta duplicati
        if (seenSlugs.has(player.slug)) continue;

        // Solo giocatori attivi nel club
        if (player.activeClub?.slug !== club.slug) continue;

        const position = player.anyPositions?.[0] || "Unknown";
        const clubCode = club.code || player.activeClub?.code || "UNK";
        const newKey = KVPlayerRepository.makeKey(clubCode, player.slug);

        try {
          const existingInfo = existingKeysMap.get(player.slug);
          
          if (existingInfo) {
            const { keyName, metadata } = existingInfo;
            
            // Possiamo verificare i cambiamenti senza fare KV get se abbiamo i metadati!
            let hasChanges = false;
            
            if (metadata) {
              hasChanges = 
                metadata.name !== player.displayName ||
                metadata.clubSlug !== club.slug ||
                metadata.position !== position;
            } else {
              // Non abbiamo metadati (vecchia versione), dobbiamo fare fetch
              hasChanges = true; 
            }

            if (hasChanges) {
              // Dobbiamo fare fetch per non perdere le statistiche (se esistono)
              // findBySlug utilizzerà la cache interna se disponibile
              const existingPlayer = await repository.findBySlug(player.slug);
              
              if (existingPlayer) {
                 const updates: Partial<PlayerRecord> = {
                  name: player.displayName,
                  clubSlug: club.slug,
                  clubName: club.name,
                  clubCode,
                  position,
                };

                // Se il club è cambiato, eliminiamo la vecchia chiave
                if (keyName !== newKey) {
                  await (repository as any).kv.delete(keyName);
                  console.log(`Club changed for ${player.displayName}: deleted old key ${keyName}`);
                }

                // updatePlayer gestisce correttamente i metadati e la cache
                const updated = await repository.updatePlayer(player.slug, updates);
                if (updated) {
                  result.updated++;
                  console.log(`Updated: ${player.displayName} (${club.name})`);
                }
              }
            } else {
              // Nessun cambiamento nei campi base, saltiamo (RISPARMIO API REQUESTS!)
              result.unchanged++;
            }
          } else {
            // Nuovo giocatore
            const newPlayer: PlayerRecord = {
              slug: player.slug,
              name: player.displayName,
              clubSlug: club.slug,
              clubName: club.name,
              clubCode,
              position,
            };

            const added = await repository.addPlayer(newPlayer);
            if (added) {
              result.added++;
              console.log(`Added: ${player.displayName} (${club.name})`);
            }
          }

          seenSlugs.add(player.slug);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Error processing ${player.slug}: ${msg}`);
          result.errors.push(`${player.slug}: ${msg}`);
        }
      }
    }

    result.total = seenSlugs.size;
    console.log(`\n✅ Extract complete:`);
    console.log(`   Added: ${result.added}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Unchanged: ${result.unchanged}`);
    console.log(`   Total: ${result.total}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Extract players failed: ${msg}`);
    result.errors.push(`Fatal: ${msg}`);
    return result;
  }
}
