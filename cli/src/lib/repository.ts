/**
 * Repository Pattern - Layer di persistenza dati giocatori
 *
 * Questo modulo fornisce un'astrazione per la gestione dei dati dei giocatori.
 * L'implementazione corrente usa file JSON locale, ma in futuro può essere
 * sostituita con chiamate API a un database esterno.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ============================================================================
// INTERFACCE BASE
// ============================================================================

/**
 * Dati base di un giocatore MLS
 */
export interface PlayerBaseData {
  slug: string;
  name: string;
  clubSlug: string;
  clubName: string;
  clubCode?: string; // Codice a 3 lettere del club (es. "ATL", "MIA")
  position?: string;
}

/**
 * Analisi home/away performance (senza scores espliciti per compattezza)
 */
export interface HomeAwayStats {
  calculatedAt: string;
  gamesAnalyzed: number;
  home: {
    games: number;
    average: number;
  };
  away: {
    games: number;
    average: number;
  };
  homeAdvantageFactor: number;
}

/**
 * Statistiche All-Around (AA5/AA15/AA25)
 */
export interface AAStats {
  calculatedAt: string;
  gamesAnalyzed: number;
  AA5: number | null;
  AA15: number | null;
  AA25: number | null;
  validScores: number[];
}

/**
 * Probabilità di titolarità (solo starter %)
 */
export interface StartingOdds {
  starterOddsBasisPoints: number;
}

/**
 * Probabilità di vittoria/pareggio/sconfitta
 */
export interface WinOdds {
  winOddsBasisPoints: number;
  drawOddsBasisPoints: number;
  loseOddsBasisPoints: number;
}

/**
 * Prossima partita con probabilità
 */
export interface NextFixtureOdds {
  fixtureDate: string;
  opponent: string;
  isHome: boolean;
  startingOdds: StartingOdds | null;
  teamWinOdds: WinOdds | null;
}

/**
 * Statistiche probabilità per un giocatore
 */
export interface OddsStats {
  calculatedAt: string;
  nextFixture: NextFixtureOdds | null;
}

/**
 * Statistiche aggregate di un giocatore
 */
export interface PlayerStats {
  homeAwayAnalysis?: HomeAwayStats;
  aaAnalysis?: AAStats;
  odds?: OddsStats;
  // Spazio per future statistiche:
  // last5Games?: GameStats[];
  // seasonStats?: SeasonStats;
  // injuryHistory?: InjuryRecord[];
}

/**
 * Record completo di un giocatore nel repository
 */
export interface PlayerRecord extends PlayerBaseData {
  stats?: PlayerStats;
}

/**
 * Struttura completa del file mls-players.json
 */
export interface MlsPlayersDatabase {
  league: string;
  leagueSlug: string;
  season: number;
  totalPlayers: number;
  totalClubs: number;
  /*
  clubs: {
    slug: string;
    name: string;
    playerCount: number;
  }[];
  */
  players: PlayerRecord[];
  extractedAt: string;
  version: number;
}

// ============================================================================
// INTERFACCIA REPOSITORY
// ============================================================================

/**
 * Interfaccia per il repository dei giocatori.
 *
 * Implementazioni:
 * - JsonFilePlayerRepository: salva/legge da file JSON locale
 * - ApiPlayerRepository (futuro): chiama API esterna
 */
export interface PlayerRepository {
  /**
   * Carica l'intero database
   */
  load(): Promise<MlsPlayersDatabase>;

  /**
   * Salva l'intero database
   */
  save(database: MlsPlayersDatabase): Promise<void>;

  /**
   * Trova un giocatore per slug
   */
  findBySlug(slug: string): Promise<PlayerRecord | undefined>;

  /**
   * Aggiorna un singolo giocatore
   * @returns true se l'aggiornamento è avvenuto, false altrimenti
   */
  updatePlayer(
    slug: string,
    updates: Partial<PlayerRecord>,
    strategy?: UpdateStrategy
  ): Promise<boolean>;

  /**
   * Aggiorna dati di statistiche per un giocatore
   */
  updatePlayerStats(
    slug: string,
    stats: Partial<PlayerStats>,
    strategy?: UpdateStrategy
  ): Promise<boolean>;

  /**
   * Aggiorna molti giocatori in batch
   * @returns mappa slug -> risultato aggiornamento
   */
  updateMany(
    updates: Array<{ slug: string; data: Partial<PlayerRecord> }>,
    strategy?: UpdateStrategy
  ): Promise<Map<string, boolean>>;
}

// ============================================================================
// STRATEGIE DI AGGIORNAMENTO
// ============================================================================

/**
 * Interfaccia per strategie di aggiornamento dati.
 * Permette di definire regole custom su quando aggiornare o meno.
 */
export interface UpdateStrategy {
  /**
   * Determina se aggiornare il campo esistente con il nuovo valore
   * @param currentValue - valore attuale (può essere undefined)
   * @param newValue - nuovo valore proposto
   * @param fieldPath - percorso del campo (es. "stats.homeAwayAnalysis.home.average")
   * @returns true se deve aggiornare, false per preservare il valore esistente
   */
  shouldUpdate<T>(
    currentValue: T | undefined,
    newValue: T | undefined,
    fieldPath: string
  ): boolean;
}

/**
 * Strategia di default: aggiorna sempre i dati cambiati, preserva se nuovo è null/undefined
 */
export class DefaultUpdateStrategy implements UpdateStrategy {
  shouldUpdate<T>(
    currentValue: T | undefined,
    newValue: T | undefined,
    _fieldPath: string
  ): boolean {
    // Se il nuovo valore è null o undefined, preserva il vecchio
    if (newValue === null || newValue === undefined) {
      return false;
    }

    // Se il vecchio valore non esiste, usa il nuovo
    if (currentValue === undefined) {
      return true;
    }

    // Se sono oggetti/array, confronta JSON.stringify
    if (typeof currentValue === "object" && typeof newValue === "object") {
      return JSON.stringify(currentValue) !== JSON.stringify(newValue);
    }

    // Per tipi primitivi, confronta direttamente
    return currentValue !== newValue;
  }
}

/**
 * Strategia che forza l'aggiornamento anche con valori null/undefined
 */
export class ForceUpdateStrategy implements UpdateStrategy {
  shouldUpdate<T>(
    currentValue: T | undefined,
    newValue: T | undefined,
    _fieldPath: string
  ): boolean {
    // Aggiorna sempre, anche se il nuovo è null/undefined
    if (currentValue === undefined && newValue === undefined) {
      return false;
    }

    if (typeof currentValue === "object" && typeof newValue === "object") {
      return JSON.stringify(currentValue) !== JSON.stringify(newValue);
    }

    return currentValue !== newValue;
  }
}

/**
 * Strategia che aggiorna solo se i dati sono più vecchi di X ore
 */
export class FreshnessUpdateStrategy implements UpdateStrategy {
  private maxAgeHours: number;

  constructor(maxAgeHours: number) {
    this.maxAgeHours = maxAgeHours;
  }

  shouldUpdate<T>(
    currentValue: T | undefined,
    newValue: T | undefined,
    fieldPath: string
  ): boolean {
    // Se è un campo timestamp, controlla la freshness
    if (
      (fieldPath.endsWith("calculatedAt") ||
        fieldPath.endsWith("lastUpdated")) &&
      typeof currentValue === "string" &&
      typeof newValue === "string"
    ) {
      const currentDate = new Date(currentValue);
      const maxAgeMs = this.maxAgeHours * 60 * 60 * 1000;
      return Date.now() - currentDate.getTime() > maxAgeMs;
    }

    // Per altri campi, usa la logica di default
    const defaultStrategy = new DefaultUpdateStrategy();
    return defaultStrategy.shouldUpdate(currentValue, newValue, fieldPath);
  }
}

// ============================================================================
// IMPLEMENTAZIONE FILE JSON
// ============================================================================

const DEFAULT_DB_PATH = "./data/mls-players.json";

export class JsonFilePlayerRepository implements PlayerRepository {
  private filePath: string;

  constructor(filePath: string = DEFAULT_DB_PATH) {
    this.filePath = resolve(filePath);
  }

  async load(): Promise<MlsPlayersDatabase> {
    if (!existsSync(this.filePath)) {
      throw new Error(`Database file not found: ${this.filePath}`);
    }

    const content = readFileSync(this.filePath, "utf-8");
    const data = JSON.parse(content) as MlsPlayersDatabase;

    // Rimuovi metadata dai giocatori se presenti
    const cleanedPlayers = data.players.map((player) => {
      const { metadata: _, ...rest } = player as PlayerRecord & {
        metadata?: unknown;
      };
      return rest as PlayerRecord;
    });

    // Migra dati vecchi se necessario
    return this.migrateIfNeeded({
      ...data,
      players: cleanedPlayers,
    });
  }

  async save(database: MlsPlayersDatabase): Promise<void> {
    // Aggiorna metadati del database
    const updatedDb: MlsPlayersDatabase = {
      ...database,
      version: database.version || 1,
    };

    // Rimuovi i campi scores per compattezza prima di salvare
    const compactDb = this.removeScores(updatedDb);

    writeFileSync(this.filePath, JSON.stringify(compactDb, null, 2));
  }

  /**
   * Rimuove ricorsivamente i campi 'scores' e 'validScores' per compattezza
   */
  private removeScores<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeScores(item)) as unknown as T;
    }

    if (obj !== null && typeof obj === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Salta i campi scores e validScores
        if (key === "scores" || key === "validScores") {
          continue;
        }
        result[key] = this.removeScores(value);
      }
      return result as T;
    }

    return obj;
  }

  async findBySlug(slug: string): Promise<PlayerRecord | undefined> {
    const db = await this.load();
    return db.players.find((p) => p.slug === slug);
  }

  async updatePlayer(
    slug: string,
    updates: Partial<PlayerRecord>,
    strategy: UpdateStrategy = new DefaultUpdateStrategy()
  ): Promise<boolean> {
    const db = await this.load();
    const playerIndex = db.players.findIndex((p) => p.slug === slug);

    if (playerIndex === -1) {
      throw new Error(`Player not found: ${slug}`);
    }

    const currentPlayer = db.players[playerIndex];
    const mergedPlayerRaw = this.deepMergeWithStrategy(
      currentPlayer as unknown as Record<string, unknown>,
      updates as unknown as Record<string, unknown>,
      strategy,
      ""
    );

    const mergedPlayer = mergedPlayerRaw as unknown as PlayerRecord;

    // Verifica se ci sono cambiamenti reali
    const hasChanges =
      JSON.stringify(currentPlayer) !== JSON.stringify(mergedPlayer);

    if (hasChanges) {
      db.players[playerIndex] = mergedPlayer;
      await this.save(db);
    }

    return hasChanges;
  }

  async updatePlayerStats(
    slug: string,
    stats: Partial<PlayerStats>,
    strategy: UpdateStrategy = new DefaultUpdateStrategy()
  ): Promise<boolean> {
    const updates: Partial<PlayerRecord> = {
      stats: stats as PlayerStats,
    };
    return this.updatePlayer(slug, updates, strategy);
  }

  async updateMany(
    updates: Array<{ slug: string; data: Partial<PlayerRecord> }>,
    strategy: UpdateStrategy = new DefaultUpdateStrategy()
  ): Promise<Map<string, boolean>> {
    const db = await this.load();
    const results = new Map<string, boolean>();
    let hasAnyChange = false;

    for (const { slug, data } of updates) {
      const playerIndex = db.players.findIndex((p) => p.slug === slug);

      if (playerIndex === -1) {
        results.set(slug, false);
        console.warn(`Warning: Player not found in batch update: ${slug}`);
        continue;
      }

      const currentPlayer = db.players[playerIndex];
      const mergedPlayerRaw = this.deepMergeWithStrategy(
        currentPlayer as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
        strategy,
        ""
      );

      const mergedPlayer = mergedPlayerRaw as unknown as PlayerRecord;

      const hasChanges =
        JSON.stringify(currentPlayer) !== JSON.stringify(mergedPlayer);
      results.set(slug, hasChanges);

      if (hasChanges) {
        db.players[playerIndex] = mergedPlayer;
        hasAnyChange = true;
      }
    }

    if (hasAnyChange) {
      await this.save(db);
    }

    return results;
  }

  /**
   * Merge ricorsivo con applicazione della strategia di aggiornamento
   */
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

  /**
   * Migra dati da formati vecchi se necessario
   */
  private migrateIfNeeded(data: MlsPlayersDatabase): MlsPlayersDatabase {
    // Assicurati che tutti i giocatori abbiano la struttura corretta
    const migratedPlayers = data.players.map((player) => {
      // Se il giocatore ha dati "piatti" (vecchio formato), convertili
      const playerAsRecord = player as unknown as Record<string, unknown>;
      if (playerAsRecord.calculatedAt !== undefined) {
        // Era nel vecchio formato con dati stats al livello root
        const legacyPlayer = player as unknown as Record<string, unknown>;

        return {
          slug: legacyPlayer.slug as string,
          name:
            (legacyPlayer.displayName as string) ||
            (legacyPlayer.name as string),
          clubSlug: legacyPlayer.clubSlug as string,
          clubName: legacyPlayer.clubName as string,
          position: legacyPlayer.position as string,
          stats: {
            homeAwayAnalysis: {
              calculatedAt: legacyPlayer.calculatedAt as string,
              gamesAnalyzed: legacyPlayer.gamesAnalyzed as number,
              home: legacyPlayer.home as HomeAwayStats["home"],
              away: legacyPlayer.away as HomeAwayStats["away"],
              homeAdvantageFactor: legacyPlayer.homeAdvantageFactor as number,
            },
          },
        };
      }

      return player;
    });

    return {
      ...data,
      players: migratedPlayers,
      version: data.version || 1,
    };
  }
}

// ============================================================================
// FACTORY E UTILITIES
// ============================================================================

/**
 * Crea un'istanza del repository predefinita
 */
export function createPlayerRepository(filePath?: string): PlayerRepository {
  return new JsonFilePlayerRepository(filePath);
}

/**
 * Helper per creare statistiche home/away dal formato raw
 * Nota: gli scores espliciti vengono omessi per compattezza
 */
export function createHomeAwayStats(
  data: Omit<HomeAwayStats, "calculatedAt"> & {
    calculatedAt?: string;
    home: { games: number; average: number; scores?: number[] };
    away: { games: number; average: number; scores?: number[] };
  }
): HomeAwayStats {
  return {
    calculatedAt: data.calculatedAt || new Date().toISOString(),
    gamesAnalyzed: data.gamesAnalyzed,
    home: {
      games: data.home.games,
      average: data.home.average,
    },
    away: {
      games: data.away.games,
      average: data.away.average,
    },
    homeAdvantageFactor: data.homeAdvantageFactor,
  };
}
