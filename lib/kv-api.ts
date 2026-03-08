/**
 * Client API per il KV Store remoto.
 * Base URL: https://sorare-mls-sync.loziobiz.workers.dev
 */

import { KV_CARDS_BATCH_SIZE } from "../shared/kv-constants.js";
import type {
  KvBatchSaveRequest,
  KvBatchSaveResponse,
  KvCardResponse,
  KvCardsCountResponse,
  KvCardsListResponse,
  KvCardValue,
  KvNextFixture,
  KvPlayerData,
  KvSingleSaveRequest,
  KvSingleSaveResponse,
  UnifiedCard,
} from "./kv-types";
import { KvApiError, KvSyncError } from "./kv-types";
import type { CardData } from "./sorare-api";

const API_BASE_URL = "https://sorare-mls-sync.loziobiz.workers.dev";

// Regex per estrarre l'anno dallo slug della carta
const YEAR_REGEX = /^\d{4}$/;

// ============================================================================
// HTTP Utilities
// ============================================================================

async function httpGet<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(endpoint, API_BASE_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new KvApiError(
      `HTTP ${response.status}: ${errorText}`,
      response.status,
      endpoint
    );
  }

  return response.json() as Promise<T>;
}

async function httpPost<T>(endpoint: string, body: unknown): Promise<T> {
  const url = new URL(endpoint, API_BASE_URL);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new KvApiError(
      `HTTP ${response.status}: ${errorText}`,
      response.status,
      endpoint
    );
  }

  return response.json() as Promise<T>;
}

async function httpDelete<T>(endpoint: string): Promise<T> {
  const url = new URL(endpoint, API_BASE_URL);

  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new KvApiError(
      `HTTP ${response.status}: ${errorText}`,
      response.status,
      endpoint
    );
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Estrae il club code e player slug dalla struttura Sorare.
 */
function extractClubCode(card: CardData): string {
  // Prova a prendere il code dal club attivo
  const clubCode = card.anyPlayer?.activeClub?.code;
  if (clubCode) {
    return clubCode.toUpperCase();
  }

  // Fallback: estrai dallo slug del giocatore se possibile
  // Format tipo: "giocatore-2024-2025-rare-123"
  // Oppure possiamo usare una mappatura nota

  // Prova a inferire dalla competizione
  const competitions = card.anyPlayer?.activeClub?.activeCompetitions ?? [];
  for (const comp of competitions) {
    if (comp.country?.code) {
      // Per MLS è "us", ma il club code è tipo "ATL"
      // Per ora ritorniamo un placeholder che verrà corretto dall'utente
      break;
    }
  }

  // Se non troviamo niente, usiamo "UNK" (unknown)
  return "UNK";
}

function extractPlayerSlug(card: CardData): string {
  // Lo slug della carta contiene lo slug del giocatore
  // Format: "nome-giocatore-2024-2025-rarity-123"
  // Dobbiamo estrarre solo la parte nome-giocatore

  const cardSlug = card.slug;

  // Rimuovi la parte finale (anno-rarità-seriale)
  // Esempio: "lionel-messi-2024-2025-rare-42" -> "lionel-messi"
  const parts = cardSlug.split("-");

  // Trova dove inizia l'anno (4 cifre)
  let yearIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (YEAR_REGEX.test(parts[i] ?? "")) {
      yearIndex = i;
      break;
    }
  }

  if (yearIndex > 0) {
    return parts.slice(0, yearIndex).join("-");
  }

  // Fallback: usa lo slug della carta come è
  return cardSlug;
}

/**
 * Trasforma un CardData Sorare nel formato value per il KV.
 */
export function transformCardToKvValue(
  card: CardData,
  userId: string
): {
  userId: string;
  clubCode: string;
  playerSlug: string;
  cardData: Omit<KvCardValue, "userId" | "clubCode" | "playerSlug">;
} {
  const clubCode = extractClubCode(card);
  const playerSlug = extractPlayerSlug(card);

  // Costruisci l'oggetto value con tutti i dati necessari
  const cardData: Omit<KvCardValue, "userId" | "clubCode" | "playerSlug"> = {
    // Identificativi
    slug: card.slug,
    name: card.name,
    rarityTyped: card.rarityTyped,

    // Dati giocatore
    anyPositions: card.anyPositions,
    pictureUrl: card.pictureUrl,
    inSeasonEligible: card.inSeasonEligible,
    sealed: card.sealed,
    sealedAt: card.sealedAt,

    // Power
    power: card.power,
    powerBreakdown: card.powerBreakdown,

    // Averages
    l5Average: card.l5Average,
    l10Average: card.l10Average,
    l15Average: card.l15Average,
    l40Average: card.l40Average,

    // Prezzi
    cardPrice: card.cardPrice,
    lowestPriceCard: card.lowestPriceCard,
    latestPrimaryOffer: card.latestPrimaryOffer,
    priceRange: card.priceRange,

    // Storico
    so5Scores: card.so5Scores,
    ownershipHistory: card.ownershipHistory,
    liveSingleSaleOffer: card.liveSingleSaleOffer,
    privateMinPrices: card.privateMinPrices,
    publicMinPrices: card.publicMinPrices,

    // Club info
    clubName: card.anyPlayer?.activeClub?.name,
    leagueName: card.anyPlayer?.activeClub?.activeCompetitions?.find(
      (c) => c.format === "DOMESTIC_LEAGUE"
    )?.name,
    activeCompetitions: card.anyPlayer?.activeClub?.activeCompetitions,

    // Timestamp
    savedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };

  return {
    userId,
    clubCode,
    playerSlug,
    cardData,
  };
}

/**
 * Estrae nextGame da playerData.stats.odds.nextFixture
 */
function extractNextGame(
  playerData: KvPlayerData | null
): UnifiedCard["nextGame"] | undefined {
  if (!playerData) {
    return undefined;
  }
  const nextFixture = playerData.stats?.odds?.nextFixture;
  if (!nextFixture) {
    return undefined;
  }

  return {
    date: nextFixture.fixtureDate,
    homeTeam: {
      name: nextFixture.isHome ? playerData.clubName : nextFixture.opponent,
      code: nextFixture.isHome ? playerData.clubCode : nextFixture.opponentCode,
    },
    awayTeam: {
      name: nextFixture.isHome ? nextFixture.opponent : playerData.clubName,
      code: nextFixture.isHome ? nextFixture.opponentCode : playerData.clubCode,
    },
    homeStats: {
      winOddsBasisPoints: nextFixture.teamWinOdds.winOddsBasisPoints,
      drawOddsBasisPoints: nextFixture.teamWinOdds.drawOddsBasisPoints,
      loseOddsBasisPoints: nextFixture.teamWinOdds.loseOddsBasisPoints,
    },
    awayStats: {
      winOddsBasisPoints: nextFixture.teamWinOdds.winOddsBasisPoints,
      drawOddsBasisPoints: nextFixture.teamWinOdds.drawOddsBasisPoints,
      loseOddsBasisPoints: nextFixture.teamWinOdds.loseOddsBasisPoints,
    },
    projectedScore: nextFixture.projectedScore,
  };
}

/**
 * Estrae starter odds da playerData.stats.odds.nextFixture
 */
function extractStarterOdds(
  nextFixture: KvNextFixture | undefined
): UnifiedCard["nextClassicFixturePlayingStatusOdds"] | undefined {
  if (!nextFixture) {
    return undefined;
  }

  return {
    starterOddsBasisPoints: nextFixture.startingOdds.starterOddsBasisPoints,
    substituteOddsBasisPoints: 0,
    nonPlayingOddsBasisPoints: 0,
    reliability: "medium",
    providerIconUrl: "",
  };
}

/**
 * Estrae il nome del club dai dati disponibili
 */
function extractClubName(value: KvCardValue): string {
  // 1. Usa il nome del club salvato (se disponibile)
  if (value.clubName) {
    return value.clubName;
  }
  // 2. Fallback a clubCode
  return value.clubCode ?? "Unknown";
}

/**
 * Costruisce activeCompetitions da leagueName
 */
function buildActiveCompetitions(
  leagueName: string | undefined
): Array<{ name: string; displayName: string; format: string }> {
  if (!leagueName) {
    return [];
  }

  return [
    {
      name: leagueName,
      displayName: leagueName,
      format: "DOMESTIC_LEAGUE",
    },
  ];
}

/**
 * Costruisce la struttura anyPlayer per retrocompatibilità
 * Funziona sia con playerData (MLS) che senza (altre leghe)
 */
function buildAnyPlayer(
  value: KvCardValue,
  playerData: KvPlayerData | null,
  nextGame: UnifiedCard["nextGame"],
  starterOdds: UnifiedCard["nextClassicFixturePlayingStatusOdds"]
): UnifiedCard["anyPlayer"] {
  const clubName = playerData?.clubName ?? extractClubName(value);
  const clubCode = playerData?.clubCode ?? value.clubCode ?? "UNK";
  const leagueName = value.leagueName;

  // Usa activeCompetitions esistenti o costruisci da leagueName
  const activeCompetitions =
    value.activeCompetitions ?? buildActiveCompetitions(leagueName);

  return {
    activeClub: {
      name: clubName,
      code: clubCode,
      pictureUrl: value.pictureUrl,
      activeCompetitions,
    },
    nextGame: nextGame
      ? {
          date: nextGame.date,
          homeTeam: {
            name: nextGame.homeTeam.name,
            code: nextGame.homeTeam.code,
          },
          awayTeam: {
            name: nextGame.awayTeam.name,
            code: nextGame.awayTeam.code,
          },
          homeStats: nextGame.homeStats,
          awayStats: nextGame.awayStats,
        }
      : null,
    nextClassicFixturePlayingStatusOdds: starterOdds ?? null,
  };
}

/**
 * Mappa i dati del KV nel formato UnifiedCard per l'UI.
 */
export function mapKvCardToUnifiedCard(kvCard: KvCardResponse): UnifiedCard {
  const { value, playerData } = kvCard;

  const nextGame = extractNextGame(playerData);
  const nextFixture = playerData?.stats?.odds?.nextFixture;
  const starterOdds = extractStarterOdds(nextFixture);
  const anyPlayer = buildAnyPlayer(value, playerData, nextGame, starterOdds);

  return {
    // Dati base
    slug: value.slug,
    name: value.name,
    rarityTyped: value.rarityTyped,
    anyPositions: value.anyPositions,
    pictureUrl: value.pictureUrl,
    inSeasonEligible: value.inSeasonEligible,
    sealed: value.sealed,
    sealedAt: value.sealedAt,

    // Power
    power: value.power,
    powerBreakdown: value.powerBreakdown,

    // Averages
    l5Average: value.l5Average,
    l10Average: value.l10Average,
    l15Average: value.l15Average,
    l40Average: value.l40Average,

    // Prezzi
    cardPrice: value.cardPrice,
    lowestPriceCard: value.lowestPriceCard,
    latestPrimaryOffer: value.latestPrimaryOffer,
    priceRange: value.priceRange,

    // Storico
    so5Scores: value.so5Scores,
    ownershipHistory: value.ownershipHistory,
    liveSingleSaleOffer: value.liveSingleSaleOffer,
    privateMinPrices: value.privateMinPrices,
    publicMinPrices: value.publicMinPrices,

    // Club (da playerData se MLS, altrimenti da value)
    clubSlug: playerData?.clubSlug ?? value.clubCode ?? "unknown",
    clubName: playerData?.clubName ?? extractClubName(value),
    clubCode: playerData?.clubCode ?? value.clubCode ?? "UNK",
    leagueName: value.leagueName,
    activeCompetitions:
      value.activeCompetitions ?? buildActiveCompetitions(value.leagueName),

    // Next game
    nextGame,
    nextClassicFixturePlayingStatusOdds: starterOdds,

    // Player stats (opzionale)
    playerStats: playerData?.stats,

    // Metadata
    savedAt: value.savedAt,
    lastSyncedAt: value.lastSyncedAt,

    // Retrocompatibilità
    anyPlayer,
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Recupera tutte le carte dell'utente con i dati dei giocatori innestati.
 * @param skipCache - Se true, aggiunge un param per bypassare la cache worker (per reload post-sync)
 */
export function fetchUserCardsWithPlayers(
  userId: string,
  options?: {
    clubCode?: string;
    limit?: number;
    cursor?: string;
    /** Param per bypassare cache worker; usa _t=timestamp per URL univoco */
    skipCache?: boolean;
    /** Timestamp per skipCache, usato da fetchAllUserCards per coerenza tra pagine */
    _skipCacheT?: number;
  }
): Promise<KvCardsListResponse> {
  const params: Record<string, string> = {
    userId,
    ...(options?.clubCode && { clubCode: options.clubCode }),
    ...(options?.limit && { limit: options.limit.toString() }),
    ...(options?.cursor && { cursor: options.cursor }),
  };
  if (options?.skipCache) {
    params._t = String(options._skipCacheT ?? Date.now());
  }
  return httpGet<KvCardsListResponse>("/api/cards/with-players", params);
}

/**
 * Recupera tutte le carte dell'utente (senza playerData).
 * Più veloce ma con meno dati.
 */
export function fetchUserCards(
  userId: string,
  options?: {
    clubCode?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<KvCardsListResponse> {
  return httpGet<KvCardsListResponse>("/api/cards", {
    userId,
    ...(options?.clubCode && { clubCode: options.clubCode }),
    ...(options?.limit && { limit: options.limit.toString() }),
    ...(options?.cursor && { cursor: options.cursor }),
  });
}

/**
 * Conta le carte dell'utente.
 */
export function countUserCards(
  userId: string,
  clubCode?: string
): Promise<KvCardsCountResponse> {
  return httpGet<KvCardsCountResponse>("/api/cards/count", {
    userId,
    ...(clubCode && { clubCode }),
  });
}

/**
 * Salva il JWT dell'utente nel worker per sincronizzazioni automatiche.
 * Da chiamare dopo login (con o senza 2FA).
 */
export function saveUserJwt(
  userId: string,
  token: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return httpPost<{ success: boolean; message?: string; error?: string }>(
    "/api/user/jwt",
    { userId, token }
  );
}

/**
 * Recupera lo stato di sincronizzazione (token, scadenza, ultimo sync).
 */
export function fetchSyncStatus(
  userId: string
): Promise<SyncStatusResponse & { error?: string }> {
  return httpGet<SyncStatusResponse & { error?: string }>(
    "/api/user/sync-status",
    { userId }
  );
}

/**
 * Salva una singola carta nel KV.
 */
export function saveCard(
  request: KvSingleSaveRequest
): Promise<KvSingleSaveResponse> {
  return httpPost<KvSingleSaveResponse>("/api/cards", request);
}

/**
 * Salva multiple carte in batch (max 500 per chiamata).
 */
export function saveCardsBatch(
  request: KvBatchSaveRequest
): Promise<KvBatchSaveResponse> {
  return httpPost<KvBatchSaveResponse>("/api/cards/batch", request);
}

/**
 * Elimina una carta dal KV.
 */
export function deleteCard(cardKey: string): Promise<KvSingleSaveResponse> {
  return httpDelete<KvSingleSaveResponse>(
    `/api/cards/${encodeURIComponent(cardKey)}`
  );
}

/**
 * Sincronizza le carte da Sorare al KV.
 * 1. Recupera tutte le carte da Sorare GraphQL
 * 2. Trasforma nel formato KV
 * 3. Salva in batch sul KV
 */
export async function syncCardsToKv(
  userId: string,
  sorareCards: CardData[],
  onProgress?: (saved: number, total: number) => void
): Promise<KvBatchSaveResponse> {
  const batchSize = KV_CARDS_BATCH_SIZE;
  const results: KvBatchSaveResponse["results"] = [];

  // Dividi in batch
  for (let i = 0; i < sorareCards.length; i += batchSize) {
    const batch = sorareCards.slice(i, i + batchSize);

    // Trasforma le carte
    const kvCards = batch.map((card) => transformCardToKvValue(card, userId));

    // Salva il batch
    const response = await saveCardsBatch({ cards: kvCards });
    results.push(...response.results);

    onProgress?.(
      Math.min(i + batchSize, sorareCards.length),
      sorareCards.length
    );
  }

  const successCount = results.filter((r) => r.success).length;
  const errorCount = sorareCards.length - successCount;
  const summary = {
    total: sorareCards.length,
    success: successCount,
    errors: errorCount,
  };

  if (errorCount > 0) {
    const failedResults = results.filter((r) => !r.success);
    const failedSlugs = failedResults
      .map((r) => r.key.split(":").pop() ?? r.key)
      .slice(0, 5)
      .join(", ");
    const more =
      failedResults.length > 5 ? ` e altre ${failedResults.length - 5}` : "";
    throw new KvSyncError(
      `Sync fallito: ${errorCount} di ${sorareCards.length} carte non salvate (es. ${failedSlugs}${more})`,
      summary,
      failedResults.map((r) => ({ key: r.key, error: r.error }))
    );
  }

  return {
    success: true,
    summary,
    results,
  };
}

/**
 * Recupera tutte le carte con paginazione automatica.
 * Utile quando ci sono più di 1000 carte.
 * @param skipCache - Se true, bypassa la cache worker (per reload post-sync autorevole)
 */
export async function fetchAllUserCards(
  userId: string,
  options?: { onProgress?: (count: number) => void; skipCache?: boolean }
): Promise<UnifiedCard[]> {
  const allCards: UnifiedCard[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  const skipCacheT = options?.skipCache ? Date.now() : undefined;

  while (hasMore) {
    const response = await fetchUserCardsWithPlayers(userId, {
      limit: 1000,
      cursor,
      skipCache: options?.skipCache,
      _skipCacheT: skipCacheT,
    });

    const unifiedCards = response.cards.map(mapKvCardToUnifiedCard);
    allCards.push(...unifiedCards);

    options?.onProgress?.(allCards.length);

    hasMore = !response.complete && response.cursor !== undefined;
    cursor = response.cursor;
  }

  return allCards;
}
