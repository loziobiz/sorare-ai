/**
 * Tipi per l'integrazione con il KV Store remoto
 * URL configurabile via variabili d'ambiente (KV_WORKER_URL / VITE_KV_WORKER_URL).
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface KvCardResponse {
  key: string;
  value: KvCardValue;
  playerData: KvPlayerData | null;
}

export interface KvCardsListResponse {
  userId: string;
  count: number;
  complete: boolean;
  cursor?: string;
  cards: KvCardResponse[];
}

export interface KvCardsCountResponse {
  userId: string;
  clubCode?: string;
  count: number;
}

export interface KvBatchSaveResponse {
  success: boolean;
  summary: {
    total: number;
    success: number;
    errors: number;
  };
  results: Array<{
    success: boolean;
    key: string;
    error?: string;
  }>;
}

export interface KvSingleSaveResponse {
  success: boolean;
  key: string;
  error?: string;
}

export interface SyncStatusResponse {
  userId: string;
  hasToken: boolean;
  isValid: boolean;
  expiresInDays: number;
  lastSyncAt: string | null;
}

export interface RefreshCardsResponse {
  success: boolean;
  userId: string;
  cardsFound: number;
  cardsSaved: number;
  error?: string;
}

// ============================================================================
// Card Value Types (ciò che viene salvato nel KV)
// ============================================================================

export interface KvCardValue {
  // Identificativi (required dall'API)
  userId: string;
  clubCode: string;
  playerSlug: string;

  // Dati base carta
  slug: string;
  name: string;
  rarityTyped: string;
  anyPositions?: string[];
  pictureUrl?: string;
  inSeasonEligible?: boolean;
  sealed?: boolean;
  sealedAt?: string | null;

  // Power/XP
  power?: string;
  powerBreakdown?: {
    xp?: number;
    season?: number;
  };

  // Averages
  l5Average?: number;
  l10Average?: number;
  l15Average?: number;
  l40Average?: number;

  // Prezzi
  cardPrice?: number | null;
  lowestPriceCard?: {
    slug: string;
    cardPrice?: number | null;
  } | null;
  latestPrimaryOffer?: {
    price?: {
      eurCents?: number | null;
      usdCents?: number | null;
      referenceCurrency?: string | null;
    } | null;
    status: string;
  } | null;
  priceRange?: {
    min?: string | null;
    max?: string | null;
  } | null;

  // Storico punteggi
  so5Scores?: Array<{
    score: number;
    projectedScore: number;
    scoreStatus: string;
    game?: {
      date?: string | null;
      homeTeam?: {
        name?: string;
        code?: string;
      } | null;
      awayTeam?: {
        name?: string;
        code?: string;
      } | null;
    } | null;
  }>;

  // Storico proprietà
  ownershipHistory?: Array<{
    amounts?: {
      eurCents?: number | null;
      referenceCurrency?: string;
    } | null;
    from: string;
    transferType: string;
  }>;

  // Offerte vendita
  liveSingleSaleOffer?: {
    owners?: Array<{
      amounts?: {
        eurCents?: number | null;
        referenceCurrency?: string;
      } | null;
    } | null>;
  } | null;
  privateMinPrices?: {
    eurCents?: number | null;
    referenceCurrency?: string;
  } | null;
  publicMinPrices?: {
    eurCents?: number | null;
    referenceCurrency?: string;
  } | null;

  // Nome del club (non della lega!)
  clubName?: string;

  // Nome della lega (es. "MLS", "US Open Cup")
  leagueName?: string;

  // Competizioni del club (per filtro leghe) - legacy, ora usa leagueName
  activeCompetitions?: Array<{
    name: string;
    displayName: string;
    format: string;
    country?: {
      code: string;
      name: string;
    };
  }>;

  // Metadata
  savedAt: string;
  lastSyncedAt: string;
}

// ============================================================================
// Player Data Types (dal KV innestato)
// ============================================================================

export interface KvPlayerData {
  slug: string;
  name: string;
  clubSlug: string;
  clubName: string;
  clubCode: string;
  position: string;
  stats: KvPlayerStats;
}

export interface KvPlayerStats {
  homeAwayAnalysis?: KvHomeAwayAnalysis;
  aaAnalysis?: KvAaAnalysis;
  odds?: KvOddsAnalysis;
}

export interface KvHomeAwayAnalysis {
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

export interface KvAaAnalysis {
  calculatedAt: string;
  gamesAnalyzed: number;
  AA5: number | null;
  AA15: number | null;
  AA25: number | null;
}

export interface KvOddsAnalysis {
  calculatedAt: string;
  nextFixture?: KvNextFixture;
}

export interface KvNextFixture {
  fixtureDate: string;
  opponent: string;
  opponentCode: string;
  isHome: boolean;
  projectedScore?: number;
  startingOdds: {
    starterOddsBasisPoints: number;
  };
  teamWinOdds: {
    winOddsBasisPoints: number;
    drawOddsBasisPoints: number;
    loseOddsBasisPoints: number;
  };
}

// ============================================================================
// API Request Types
// ============================================================================

export interface KvBatchSaveRequest {
  cards: Array<{
    userId: string;
    clubCode: string;
    playerSlug: string;
    cardData: Omit<KvCardValue, "userId" | "clubCode" | "playerSlug">;
  }>;
}

export interface KvSingleSaveRequest {
  userId: string;
  clubCode: string;
  playerSlug: string;
  cardData?: Omit<KvCardValue, "userId" | "clubCode" | "playerSlug">;
}

// ============================================================================
// Unified Card Type (per l'UI)
// ============================================================================

/**
 * Tipo unificato che combina i dati della carta dal KV con i dati del giocatore.
 * Questo è il tipo che verrà usato dai componenti UI.
 *
 * Compatibilità: include anche la struttura `anyPlayer` per retrocompatibilità
 * con le funzioni di filtro esistenti.
 */
export interface UnifiedCard {
  // Identificativi
  slug: string;
  playerSlug: string;
  name: string;

  // Dati carta
  rarityTyped: string;
  anyPositions?: string[];
  pictureUrl?: string;
  inSeasonEligible?: boolean;
  sealed?: boolean;
  sealedAt?: string | null;

  // Power/XP
  power?: string;
  powerBreakdown?: {
    xp?: number;
    season?: number;
  };

  // Averages (dai dati carta Sorare, non dai player stats)
  l5Average?: number;
  l10Average?: number;
  l15Average?: number;
  l40Average?: number;

  // Prezzi
  cardPrice?: number | null;
  lowestPriceCard?: {
    slug: string;
    cardPrice?: number | null;
  } | null;
  latestPrimaryOffer?: {
    price?: {
      eurCents?: number | null;
      usdCents?: number | null;
      referenceCurrency?: string | null;
    } | null;
    status: string;
  } | null;
  priceRange?: {
    min?: string | null;
    max?: string | null;
  } | null;

  // Storico
  so5Scores?: Array<{
    score: number;
    projectedScore: number;
    scoreStatus: string;
    game?: {
      date?: string | null;
      homeTeam?: {
        name?: string;
        code?: string;
      } | null;
      awayTeam?: {
        name?: string;
        code?: string;
      } | null;
    } | null;
  }>;
  ownershipHistory?: Array<{
    amounts?: {
      eurCents?: number | null;
      referenceCurrency?: string;
    } | null;
    from: string;
    transferType: string;
  }>;
  liveSingleSaleOffer?: {
    owners?: Array<{
      amounts?: {
        eurCents?: number | null;
        referenceCurrency?: string;
      } | null;
    } | null>;
  } | null;
  privateMinPrices?: {
    eurCents?: number | null;
    referenceCurrency?: string;
  } | null;
  publicMinPrices?: {
    eurCents?: number | null;
    referenceCurrency?: string;
  } | null;

  // Club (nuova struttura piatta)
  clubSlug: string;
  clubName: string;
  clubCode: string;
  leagueName?: string;
  activeCompetitions?: Array<{
    name: string;
    displayName: string;
    format: string;
    country?: {
      code: string;
      name: string;
    };
  }>;

  // Next game (mappato da playerData.stats.odds.nextFixture)
  nextGame?: {
    date: string;
    homeTeam: {
      name: string;
      code: string;
    };
    awayTeam: {
      name: string;
      code: string;
    };
    homeStats?: {
      winOddsBasisPoints: number;
      drawOddsBasisPoints: number;
      loseOddsBasisPoints: number;
    };
    awayStats?: {
      winOddsBasisPoints: number;
      drawOddsBasisPoints: number;
      loseOddsBasisPoints: number;
    };
    projectedScore?: number;
  };

  // Starter odds (mappato da playerData.stats.odds.nextFixture.startingOdds)
  nextClassicFixturePlayingStatusOdds?: {
    starterOddsBasisPoints: number;
    substituteOddsBasisPoints: number;
    nonPlayingOddsBasisPoints: number;
    reliability: string;
    providerIconUrl: string;
  };

  // Player stats (opzionale, per debug o feature avanzate)
  playerStats?: KvPlayerStats;

  // Metadata
  savedAt: string;
  lastSyncedAt: string;

  // ============================================================================
  // Retrocompatibilità con CardData Sorare
  // ============================================================================

  /**
   * Struttura compatibile con CardData per le funzioni di filtro esistenti.
   * Nota: activeCompetitions è sintetizzato dai dati disponibili.
   */
  anyPlayer?: {
    activeClub?: {
      name: string;
      code?: string;
      pictureUrl?: string;
      activeCompetitions?: Array<{
        name: string;
        displayName: string;
        format: string;
        country?: {
          code: string;
          name: string;
        };
      }>;
    } | null;
    nextGame?: {
      date?: string | null;
      homeTeam?: {
        name?: string;
        code?: string;
      } | null;
      awayTeam?: {
        name?: string;
        code?: string;
      } | null;
      homeStats?: {
        winOddsBasisPoints?: number | null;
        drawOddsBasisPoints?: number | null;
        loseOddsBasisPoints?: number | null;
      } | null;
      awayStats?: {
        winOddsBasisPoints?: number | null;
        drawOddsBasisPoints?: number | null;
        loseOddsBasisPoints?: number | null;
      } | null;
    } | null;
    nextClassicFixturePlayingStatusOdds?: {
      starterOddsBasisPoints: number;
      substituteOddsBasisPoints: number;
      nonPlayingOddsBasisPoints: number;
      reliability: string;
      providerIconUrl: string;
    } | null;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class KvApiError extends Error {
  statusCode: number;
  endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message);
    this.name = "KvApiError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

export class UserIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserIdError";
  }
}

/** Errore quando il sync batch ha fallito per una o più carte */
export class KvSyncError extends Error {
  summary: KvBatchSaveResponse["summary"];
  failedResults: Array<{ key: string; error?: string }>;

  constructor(
    message: string,
    summary: KvBatchSaveResponse["summary"],
    failedResults: Array<{ key: string; error?: string }>
  ) {
    super(message);
    this.name = "KvSyncError";
    this.summary = summary;
    this.failedResults = failedResults;
  }
}
