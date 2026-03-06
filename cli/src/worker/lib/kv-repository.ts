/**
 * KV Repository - Implementazione PlayerRepository per Cloudflare KV
 *
 * Ogni giocatore è salvato come record KV con:
 * - Key: {clubCode}:{playerSlug} (es: "ATL:adrian-simon-gill")
 * - Value: PlayerRecord completo (JSON)
 *
 * Vantaggi:
 * - Accesso diretto per club + slug
 * - List filtrabile per clubCode (prefix)
 * - Nessun file JSON singolo da caricare
 */

import type {
  MlsPlayersDatabase,
  PlayerRecord,
  PlayerRepository,
  PlayerStats,
  UpdateStrategy,
} from "../../lib/repository.js";
import { DefaultUpdateStrategy } from "../../lib/repository.js";

// Re-export types from repository
export type {
  AAStats,
  HomeAwayStats,
  MlsPlayersDatabase,
  NextFixtureOdds,
  OddsStats,
  PlayerBaseData,
  PlayerRecord,
  PlayerStats,
  StartingOdds,
  UpdateStrategy,
  WinOdds,
} from "../../lib/repository.js";

export {
  DefaultUpdateStrategy,
  ForceUpdateStrategy,
} from "../../lib/repository.js";

/**
 * Implementazione PlayerRepository usando Cloudflare KV
 */
export class KVPlayerRepository implements PlayerRepository {
  private kv: KVNamespace;
  private keyCache: Map<string, string> | null = null;
  private valueCache: Map<string, PlayerRecord> = new Map();

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Ottiene tutte le chiavi dal KV e le cacha per la durata dell'istanza
   */
  private async getKeysMap(): Promise<
    Map<string, { keyName: string; metadata?: any }>
  > {
    const map = new Map<string, { keyName: string; metadata?: any }>();
    let cursor: string | undefined;

    do {
      const listResult = await this.kv.list({
        cursor,
        limit: 1000,
        metadata: true,
      } as any);
      for (const key of listResult.keys) {
        // I metadati in Cloudflare Workers sono direttamente nell'oggetto key della lista
        const metadata = (key as any).metadata;

        const parsed = KVPlayerRepository.parseKey(key.name);
        if (parsed) {
          if (!this.keyCache) this.keyCache = new Map();
          this.keyCache.set(parsed.playerSlug, key.name);

          map.set(parsed.playerSlug, {
            keyName: key.name,
            metadata,
          });
        }
      }
      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    return map;
  }

  /**
   * Genera la key KV per un giocatore
   * Format: {clubCode}:{playerSlug}
   */
  static makeKey(clubCode: string, playerSlug: string): string {
    return `${clubCode}:${playerSlug}`;
  }

  /**
   * Parse una key KV
   */
  static parseKey(
    key: string
  ): { clubCode: string; playerSlug: string } | null {
    const parts = key.split(":");
    if (parts.length !== 2) return null;
    return { clubCode: parts[0], playerSlug: parts[1] };
  }

  /**
   * Ottiene la mappa completa di chiavi e metadati (utile per sync)
   */
  async getKeysAndMetadata(): Promise<
    Map<string, { keyName: string; metadata?: any }>
  > {
    return this.getKeysMap();
  }

  async loadLight(): Promise<MlsPlayersDatabase> {
    const players: PlayerRecord[] = [];
    const keysMap = await this.getKeysAndMetadata();

    for (const [slug, info] of keysMap.entries()) {
      const parsed = KVPlayerRepository.parseKey(info.keyName);
      if (parsed) {
        // Logica robusta per hasAA:
        // 1. Se metadata è presente, usiamo il flag
        // 2. Se metadata è totalmente ASSENTE (null/undefined), mettiamo true come fallback
        //    per non rischiare di analizzare 0 giocatori se il list() fa i capricci.
        let hasAA = true;

        if (info.metadata) {
          hasAA =
            info.metadata.hasAA === true || info.metadata.hasAA === "true";
        }

        players.push({
          slug,
          name: info.metadata?.name || slug,
          clubSlug: info.metadata?.clubSlug || "unknown",
          clubName: info.metadata?.clubName || "Unknown",
          position: info.metadata?.position || "Unknown",
          clubCode: parsed.clubCode,
          // Flag per il filtering (usiamo una struttura stats minima)
          stats: {
            aaAnalysis: hasAA
              ? {
                  calculatedAt: "",
                  gamesAnalyzed: 0,
                  AA5: 1,
                  AA15: 1,
                  AA25: 1,
                }
              : undefined,
          } as PlayerStats,
        });
      }
    }

    const clubsMap = new Map<string, { slug: string; name: string }>();
    for (const player of players) {
      if (!clubsMap.has(player.clubSlug)) {
        clubsMap.set(player.clubSlug, {
          slug: player.clubSlug,
          name: player.clubName,
        });
      }
    }

    return {
      league: "Major League Soccer",
      leagueSlug: "major-league-soccer",
      season: new Date().getFullYear(),
      totalPlayers: players.length,
      totalClubs: clubsMap.size,
      players,
      extractedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Carica tutti i giocatori dal KV completi
   * ATTENZIONE: Usa 1 kv.get() per ogni giocatore. Rischio di Too many subrequests!
   */
  async load(): Promise<MlsPlayersDatabase> {
    const players: PlayerRecord[] = [];
    let cursor: string | undefined;

    do {
      const listResult = await this.kv.list({
        cursor,
        limit: 1000,
        metadata: true,
      } as any);

      // Batch per non sfondare le call contemporanee in memoria (ma consuma comunque le quote API)
      const batches = [];
      for (let i = 0; i < listResult.keys.length; i += 50) {
        batches.push(listResult.keys.slice(i, i + 50));
      }

      for (const batch of batches) {
        const promises = batch.map((key) => this.kv.get(key.name));
        const values = await Promise.all(promises);

        for (const value of values) {
          if (value) {
            try {
              const player = JSON.parse(value) as PlayerRecord;
              players.push(player);
              this.valueCache.set(player.slug, player); // Popola la cache
            } catch (e) {
              console.error("Failed to parse player data:", e);
            }
          }
        }
      }

      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    // Estrai clubs unici
    const clubsMap = new Map<string, { slug: string; name: string }>();
    for (const player of players) {
      if (!clubsMap.has(player.clubSlug)) {
        clubsMap.set(player.clubSlug, {
          slug: player.clubSlug,
          name: player.clubName,
        });
      }
    }

    return {
      league: "Major League Soccer",
      leagueSlug: "major-league-soccer",
      season: new Date().getFullYear(),
      totalPlayers: players.length,
      totalClubs: clubsMap.size,
      players,
      extractedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Salva l'intero database nel KV
   * Utile per import iniziale o migration
   */
  async save(database: MlsPlayersDatabase): Promise<void> {
    // Salva ogni giocatore come record KV separato
    const promises = database.players.map((player) => {
      const key = KVPlayerRepository.makeKey(
        player.clubCode || "UNK",
        player.slug
      );
      this.valueCache.set(player.slug, player); // Aggiorna cache
      return this.kv.put(key, JSON.stringify(player));
    });

    await Promise.all(promises);
  }

  /**
   * Trova un giocatore per slug
   * Utilizza la cache delle chiavi per evitare scan costosi (O(1) list operation per istanza)
   * Utilizza anche una cache dei valori per evitare kv.get ripetuti sullo stesso giocatore!
   */
  async findBySlug(slug: string): Promise<PlayerRecord | undefined> {
    // Controlla prima la cache dei valori (evita la chiamata subrequest!)
    if (this.valueCache.has(slug)) {
      return this.valueCache.get(slug);
    }

    if (!this.keyCache) {
      await this.getKeysMap(); // Inizializza la cache se non esiste
    }
    const keyName = this.keyCache?.get(slug);

    if (keyName) {
      const value = await this.kv.get(keyName);
      if (value) {
        const player = JSON.parse(value) as PlayerRecord;
        this.valueCache.set(slug, player); // Salva in cache
        return player;
      }
    }

    return undefined;
  }

  /**
   * Trova un giocatore per clubCode + slug (efficiente)
   */
  async findByClubAndSlug(
    clubCode: string,
    slug: string
  ): Promise<PlayerRecord | undefined> {
    if (this.valueCache.has(slug)) {
      return this.valueCache.get(slug);
    }

    const key = KVPlayerRepository.makeKey(clubCode, slug);
    const value = await this.kv.get(key);
    if (value) {
      const player = JSON.parse(value) as PlayerRecord;
      this.valueCache.set(slug, player);
      return player;
    }
    return undefined;
  }

  /**
   * Aggiorna un singolo giocatore
   */
  async updatePlayer(
    slug: string,
    updates: Partial<PlayerRecord>,
    strategy?: UpdateStrategy
  ): Promise<boolean> {
    // Trova il giocatore esistente
    const existing = await this.findBySlug(slug);
    if (!existing) {
      throw new Error(`Player not found: ${slug}`);
    }

    const strat = strategy || new DefaultUpdateStrategy();
    const merged = this.deepMergeWithStrategy(
      existing as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>,
      strat,
      ""
    ) as unknown as PlayerRecord;

    const hasChanges = JSON.stringify(existing) !== JSON.stringify(merged);

    if (hasChanges) {
      const key = KVPlayerRepository.makeKey(
        merged.clubCode || existing.clubCode || "UNK",
        merged.slug
      );

      // Calcola se ha dati AA per i metadati
      const hasAA = !!(
        merged.stats?.aaAnalysis?.AA5 != null ||
        merged.stats?.aaAnalysis?.AA15 != null ||
        merged.stats?.aaAnalysis?.AA25 != null
      );

      await this.kv.put(key, JSON.stringify(merged), {
        metadata: {
          name: merged.name,
          clubSlug: merged.clubSlug,
          position: merged.position,
          hasAA,
        },
      });
      // IMPORTANTISSIMO: Aggiorna la cache dei valori dopo il salvataggio
      this.valueCache.set(slug, merged);
    }

    return hasChanges;
  }

  /**
   * Aggiorna statistiche di un giocatore
   */
  async updatePlayerStats(
    slug: string,
    stats: Partial<PlayerStats>,
    strategy?: UpdateStrategy
  ): Promise<boolean> {
    const existing = await this.findBySlug(slug);
    if (!existing) {
      throw new Error(`Player not found: ${slug}`);
    }

    const updates: Partial<PlayerRecord> = {
      stats: this.mergeStats(existing.stats || {}, stats, strategy),
    };

    return this.updatePlayer(slug, updates, strategy);
  }

  /**
   * Aggiorna molti giocatori in batch
   */
  async updateMany(
    updates: Array<{ slug: string; data: Partial<PlayerRecord> }>,
    strategy?: UpdateStrategy
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Processa sequenzialmente per rispettare rate limit KV (1 write/sec per key)
    for (const { slug, data } of updates) {
      try {
        const result = await this.updatePlayer(slug, data, strategy);
        results.set(slug, result);
      } catch (error) {
        console.warn(`Failed to update player ${slug}:`, error);
        results.set(slug, false);
      }
      // Piccolo delay per rispettare rate limit
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Aggiunge un nuovo giocatore (solo se non esiste)
   */
  async addPlayer(player: PlayerRecord): Promise<boolean> {
    const key = KVPlayerRepository.makeKey(
      player.clubCode || "UNK",
      player.slug
    );

    // Verifica se esiste già (usa cache se disponibile)
    const existing = await this.findBySlug(player.slug);
    if (existing) {
      return false; // Già esistente
    }

    const hasAA = !!(
      player.stats?.aaAnalysis?.AA5 != null ||
      player.stats?.aaAnalysis?.AA15 != null ||
      player.stats?.aaAnalysis?.AA25 != null
    );

    await this.kv.put(key, JSON.stringify(player), {
      metadata: {
        name: player.name,
        clubSlug: player.clubSlug,
        position: player.position,
        hasAA,
      },
    });
    this.valueCache.set(player.slug, player);
    return true;
  }

  /**
   * Lista tutti i giocatori di un club
   */
  async listPlayersByClub(clubCode: string): Promise<PlayerRecord[]> {
    const players: PlayerRecord[] = [];
    let cursor: string | undefined;

    do {
      const listResult = await this.kv.list({
        prefix: `${clubCode}:`,
        cursor,
        limit: 100,
      });

      for (const key of listResult.keys) {
        const value = await this.kv.get(key.name);
        if (value) {
          try {
            players.push(JSON.parse(value) as PlayerRecord);
          } catch (e) {
            console.error(
              `Failed to parse player data for key ${key.name}:`,
              e
            );
          }
        }
      }

      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    return players;
  }

  /**
   * Conta totale giocatori
   */
  async countPlayers(): Promise<number> {
    let count = 0;
    let cursor: string | undefined;

    do {
      const listResult = await this.kv.list({
        cursor,
        limit: 1000,
        metadata: true,
      } as any);
      count += listResult.keys.length;
      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    return count;
  }

  /**
   * Elimina un giocatore
   */
  async deletePlayer(clubCode: string, slug: string): Promise<void> {
    const key = KVPlayerRepository.makeKey(clubCode, slug);
    await this.kv.delete(key);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private mergeStats(
    existing: PlayerStats,
    updates: Partial<PlayerStats>,
    strategy?: UpdateStrategy
  ): PlayerStats {
    const strat = strategy || new DefaultUpdateStrategy();
    return this.deepMergeWithStrategy(
      existing as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>,
      strat,
      ""
    ) as unknown as PlayerStats;
  }

  private deepMergeWithStrategy(
    current: Record<string, unknown>,
    updates: Record<string, unknown>,
    strategy: UpdateStrategy,
    path: string
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...current };

    for (const key of Object.keys(updates)) {
      const newPath = path ? `${path}.${key}` : key;
      const currentValue = current[key];
      const newValue = updates[key];

      // Se il nuovo valore è un oggetto (ma non null), merge ricorsivo
      if (
        newValue !== null &&
        typeof newValue === "object" &&
        !Array.isArray(newValue) &&
        typeof currentValue === "object" &&
        currentValue !== null &&
        !Array.isArray(currentValue)
      ) {
        result[key] = this.deepMergeWithStrategy(
          currentValue as Record<string, unknown>,
          newValue as Record<string, unknown>,
          strategy,
          newPath
        );
      } else {
        // Altrimenti applica la strategia
        if (strategy.shouldUpdate(currentValue, newValue, newPath)) {
          result[key] = newValue;
        }
      }
    }

    return result;
  }
}

/**
 * Extra Player Slugs Management
 * Keys:
 * - SYSTEM:EXTRA_PLAYER_SLUGS → string[] (lista slugs da sincronizzare)
 * - SYSTEM:EXTRA_PLAYER_SLUGS_SYNCED → string[] (lista slugs già sincronizzati)
 */

const EXTRA_PLAYER_SLUGS_KEY = "SYSTEM:EXTRA_PLAYER_SLUGS";
const EXTRA_PLAYER_SLUGS_SYNCED_KEY = "SYSTEM:EXTRA_PLAYER_SLUGS_SYNCED";

/**
 * Aggiunge uno slug alla lista dei giocatori extra da sincronizzare
 * Non duplica se già presente
 */
export async function addExtraPlayerSlug(
  kv: KVNamespace,
  slug: string
): Promise<void> {
  const existing = await kv.get(EXTRA_PLAYER_SLUGS_KEY);
  const slugs: string[] = existing ? JSON.parse(existing) : [];
  
  if (!slugs.includes(slug)) {
    slugs.push(slug);
    await kv.put(EXTRA_PLAYER_SLUGS_KEY, JSON.stringify(slugs));
    console.log(`[ExtraPlayer] Added ${slug} to sync queue (${slugs.length} total)`);
  }
}

/**
 * Ottiene la lista dei giocatori extra da sincronizzare
 */
export async function getExtraPlayerSlugs(kv: KVNamespace): Promise<string[]> {
  const value = await kv.get(EXTRA_PLAYER_SLUGS_KEY);
  return value ? JSON.parse(value) : [];
}

/**
 * Rimuove slugs dalla lista da sincronizzare e li marca come sincronizzati
 */
export async function markExtraPlayerSlugsAsSynced(
  kv: KVNamespace,
  slugs: string[]
): Promise<void> {
  const existingQueue = await kv.get(EXTRA_PLAYER_SLUGS_KEY);
  const queue: string[] = existingQueue ? JSON.parse(existingQueue) : [];
  
  // Rimuovi dalla coda
  const newQueue = queue.filter((s) => !slugs.includes(s));
  await kv.put(EXTRA_PLAYER_SLUGS_KEY, JSON.stringify(newQueue));
  
  // Aggiungi alla lista sincronizzati
  const existingSynced = await kv.get(EXTRA_PLAYER_SLUGS_SYNCED_KEY);
  const synced: string[] = existingSynced ? JSON.parse(existingSynced) : [];
  
  for (const slug of slugs) {
    if (!synced.includes(slug)) {
      synced.push(slug);
    }
  }
  await kv.put(EXTRA_PLAYER_SLUGS_SYNCED_KEY, JSON.stringify(synced));
  
  console.log(`[ExtraPlayer] Marked ${slugs.length} as synced, ${newQueue.length} remaining in queue`);
}

/**
 * Verifica se uno slug è un giocatore extra (non MLS)
 * Lo è se è nella lista sincronizzati o nella coda
 */
export async function isExtraPlayer(kv: KVNamespace, slug: string): Promise<boolean> {
  const queue = await getExtraPlayerSlugs(kv);
  if (queue.includes(slug)) return true;
  
  const syncedValue = await kv.get(EXTRA_PLAYER_SLUGS_SYNCED_KEY);
  if (syncedValue) {
    const synced: string[] = JSON.parse(syncedValue);
    return synced.includes(slug);
  }
  return false;
}

/**
 * Carica tutti i giocatori per l'analisi (MLS + Extra)
 * Con limite massimo totale (default 1200)
 * Priorità: tutti i MLS + extra più recenti
 */
export async function loadAllPlayersForAnalysis(
  kv: KVNamespace,
  repository: KVPlayerRepository,
  options: { maxTotal?: number } = {}
): Promise<PlayerRecord[]> {
  const maxTotal = options.maxTotal ?? 1200;
  
  // 1. Carica tutti i giocatori MLS (usando loadLight che è efficiente)
  const db = await repository.loadLight();
  const mlsPlayers = db.players;
  
  console.log(`[LoadAllPlayers] MLS players: ${mlsPlayers.length}`);
  
  // 2. Ottieni la lista extra sincronizzati
  const syncedValue = await kv.get(EXTRA_PLAYER_SLUGS_SYNCED_KEY);
  const extraSlugs: string[] = syncedValue ? JSON.parse(syncedValue) : [];
  
  console.log(`[LoadAllPlayers] Extra players synced: ${extraSlugs.length}`);
  
  // 3. Carica i giocatori extra dal KV
  const extraPlayers: PlayerRecord[] = [];
  
  for (const slug of extraSlugs) {
    const player = await repository.findBySlug(slug);
    if (player) {
      extraPlayers.push(player);
    }
  }
  
  // 4. Combina e limita
  const allPlayers = [...mlsPlayers, ...extraPlayers];
  
  if (allPlayers.length > maxTotal) {
    console.log(`[LoadAllPlayers] Limiting from ${allPlayers.length} to ${maxTotal}`);
    // Priorità: tutti i MLS, poi i migliori extra per qualche criterio
    // Per ora prendiamo i primi maxTotal
    return allPlayers.slice(0, maxTotal);
  }
  
  console.log(`[LoadAllPlayers] Total players to analyze: ${allPlayers.length}`);
  return allPlayers;
}

/**
 * Factory function per creare il repository
 */
export function createKVRepository(kv: KVNamespace): KVPlayerRepository {
  return new KVPlayerRepository(kv);
}
