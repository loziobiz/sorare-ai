/**
 * User Cards Handler
 *
 * Gestisce il salvataggio e recupero delle carte utente in KV.
 * Key format: USR_{USER_ID}:{CLUB_CODE}:{CARD_SLUG}
 *
 * Endpoints:
 * - POST /api/cards         : Salva singola carta
 * - POST /api/cards/batch   : Salva batch di carte
 * - GET /api/cards          : Lista carte utente (filtrabile)
 * - DELETE /api/cards/:key  : Elimina carta
 */

export interface UserCard {
  userId: string;
  clubCode: string;
  playerSlug: string;
  // Altri campi specifici della carta (non tipizzati per flessibilità)
  [key: string]: unknown;
}

export interface SaveCardRequest {
  userId: string;
  clubCode: string;
  playerSlug: string;
  cardData: Record<string, unknown>;
}

export interface SaveBatchRequest {
  cards: SaveCardRequest[];
}

export interface CardOperationResult {
  success: boolean;
  key: string;
  error?: string;
}

/**
 * Genera la key KV per una carta utente
 * Format: USR_{USER_ID}:{CLUB_CODE}:{CARD_SLUG}
 */
export function makeUserCardKey(
  userId: string,
  clubCode: string,
  cardSlug: string
): string {
  return `USR_${userId}:${clubCode}:${cardSlug}`;
}

/**
 * Parse una key carta utente
 */
export function parseUserCardKey(
  key: string
): { userId: string; clubCode: string; cardSlug: string } | null {
  if (!key.startsWith("USR_")) return null;

  const parts = key.split(":");
  if (parts.length !== 3) return null;

  const userId = parts[0].replace("USR_", "");
  return {
    userId,
    clubCode: parts[1],
    cardSlug: parts[2],
  };
}

/**
 * Estrae lo slug del giocatore corretto per il match con il database.
 * 
 * Logica:
 * 1. Se cardSlug contiene una data di nascita (YYYY-MM-DD), usa lo slug troncato dopo la data
 *    es: "andrew-thomas-1998-09-01-2025-limited-211" → "andrew-thomas-1998-09-01"
 * 2. Se NON contiene data di nascita, usa playerSlug della carta
 *    es: "oumar-solet-bomawoko-2021-limited-246" → usa card.playerSlug = "oumar-solet-bomawoko"
 * 
 * Riconosce data di nascita: pattern (\d{4}-\d{2}-\d{2}) che NON è seguito immediatamente da -limited o -rare
 */
function extractCorrectPlayerSlug(cardSlug: string, playerSlug: string): string {
  // Cerca data di nascita nel formato YYYY-MM-DD
  const dateMatch = cardSlug.match(/^(.*?-\d{4}-\d{2}-\d{2})-/);
  if (dateMatch) {
    // Caso con data di nascita: ritorna la parte fino alla data inclusa
    // es: "andrew-thomas-1998-09-01-2025-limited-211" → "andrew-thomas-1998-09-01"
    return dateMatch[1];
  }
  
  // Caso senza data di nascita: usa playerSlug della carta
  return playerSlug;
}

/**
 * Pulisce i dati della carta per la risposta API
 * - Rimuove: activeCompetitions, ownershipHistory
 * - Aggiunge: leagueName (estratto da activeCompetitions[0].name)
 * - In so5Scores tiene solo: score, projectedScore, scoreStatus
 */
function sanitizeCardData(cardData: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...cardData };
  
  // Estrai nome lega (cerca MLS in activeCompetitions)
  if (Array.isArray(sanitized.activeCompetitions)) {
    const mlsComp = sanitized.activeCompetitions.find((comp: unknown) => {
      const c = comp as Record<string, unknown>;
      const name = String(c.name || '').toLowerCase();
      const slug = String(c.slug || '').toLowerCase();
      return name.includes('major league soccer') || 
             name.includes('mls') || 
             slug.includes('mls');
    }) as Record<string, unknown> | undefined;
    
    if (mlsComp?.name) {
      sanitized.leagueName = mlsComp.name;
    }
  }
  
  // Rimuovi campi non necessari
  delete sanitized.activeCompetitions;
  delete sanitized.ownershipHistory;
  
  // Filtra so5Scores
  if (Array.isArray(sanitized.so5Scores)) {
    sanitized.so5Scores = sanitized.so5Scores.map((score: Record<string, unknown>) => ({
      score: score.score,
      projectedScore: score.projectedScore,
      scoreStatus: score.scoreStatus,
    }));
  }
  
  return sanitized;
}

/**
 * Pulisce i dati giocatore per la risposta API
 * - Rimuove: aaAnalysis.validScores
 */
function sanitizePlayerData(playerData: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!playerData) return null;
  
  const sanitized = { ...playerData };
  
  // Rimuovi validScores da aaAnalysis
  if (sanitized.stats && typeof sanitized.stats === 'object') {
    const stats = { ...sanitized.stats } as Record<string, unknown>;
    if (stats.aaAnalysis && typeof stats.aaAnalysis === 'object') {
      const aaAnalysis = { ...stats.aaAnalysis } as Record<string, unknown>;
      delete aaAnalysis.validScores;
      stats.aaAnalysis = aaAnalysis;
    }
    sanitized.stats = stats;
  }
  
  return sanitized;
}

/**
 * Salva una singola carta
 * Se la carta esiste già, fa il merge dei dati (preserva campi esistenti + aggiunge nuovi)
 */
export async function saveUserCard(
  kv: KVNamespace,
  card: SaveCardRequest
): Promise<CardOperationResult> {
  try {
    // Estrai cardSlug dai cardData (obbligatorio)
    const cardSlug = card.cardData.slug as string;
    if (!cardSlug) {
      return {
        success: false,
        key: "",
        error: "cardData.slug is required",
      };
    }

    const key = makeUserCardKey(card.userId, card.clubCode, cardSlug);

    // Leggi valore esistente se presente
    const existingValue = await kv.get(key);
    let existingData: Record<string, unknown> = {};
    
    if (existingValue) {
      try {
        existingData = JSON.parse(existingValue) as Record<string, unknown>;
      } catch (e) {
        // Se il parsing fallisce, tratta come nuova carta
        existingData = {};
      }
    }

    // Merge: dati esistenti + nuovi dati (i nuovi sovrascrivono i vecchi se in conflitto)
    const value = {
      ...existingData,           // Preserva dati esistenti
      ...card.cardData,          // Sovrascrivi/aggiorna con nuovi dati
      userId: card.userId,       // Metadati sempre aggiornati
      clubCode: card.clubCode,
      playerSlug: card.playerSlug,
      slug: cardSlug,            // Slug della carta (completo)
      savedAt: new Date().toISOString(),
      updatedAt: existingValue ? new Date().toISOString() : undefined, // Solo se update
    };

    await kv.put(key, JSON.stringify(value));

    return { success: true, key };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      key: "",
      error: msg,
    };
  }
}

/**
 * Salva un batch di carte
 * Con delay minimo per rispettare rate limit KV (anche se paid)
 */
export async function saveUserCardsBatch(
  kv: KVNamespace,
  cards: SaveCardRequest[],
  options: { delayMs?: number } = {}
): Promise<{
  results: CardOperationResult[];
  successCount: number;
  errorCount: number;
}> {
  const results: CardOperationResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  const delayMs = options.delayMs ?? 10; // 10ms default (molto conservativo per paid)

  for (const card of cards) {
    const result = await saveUserCard(kv, card);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Piccolo delay tra operazioni per evitare sovraccarico
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { results, successCount, errorCount };
}

/**
 * Recupera tutte le carte di un utente
 */
export async function getUserCards(
  kv: KVNamespace,
  userId: string,
  options: {
    clubCode?: string;
    limit?: number;
    cursor?: string;
  } = {}
): Promise<{
  cards: Array<{ key: string; value: Record<string, unknown> }>;
  cursor?: string;
  complete: boolean;
}> {
  const prefix = options.clubCode
    ? `USR_${userId}:${options.clubCode}:`
    : `USR_${userId}:`;

  const listResult = await kv.list({
    prefix,
    limit: options.limit ?? 1000,
    cursor: options.cursor,
  });

  const cards: Array<{ key: string; value: Record<string, unknown> }> = [];

  for (const key of listResult.keys) {
    const value = await kv.get(key.name);
    if (value) {
      try {
        cards.push({
          key: key.name,
          value: JSON.parse(value) as Record<string, unknown>,
        });
      } catch (e) {
        console.error(`Failed to parse card ${key.name}:`, e);
      }
    }
  }

  return {
    cards: cards.map((c) => ({ ...c, value: sanitizeCardData(c.value) })),
    cursor: listResult.list_complete ? undefined : listResult.cursor,
    complete: listResult.list_complete,
  };
}

/**
 * Recupera carte utente con dati giocatore innestati
 * Per ogni carta, recupera il giocatore dal KV (key: {clubCode}:{playerSlug})
 */
export async function getUserCardsWithPlayerData(
  kv: KVNamespace,
  userId: string,
  options: {
    clubCode?: string;
    limit?: number;
    cursor?: string;
  } = {}
): Promise<{
  cards: Array<{
    key: string;
    value: Record<string, unknown>;
    playerData: Record<string, unknown> | null;
  }>;
  cursor?: string;
  complete: boolean;
}> {
  const prefix = options.clubCode
    ? `USR_${userId}:${options.clubCode}:`
    : `USR_${userId}:`;

  const listResult = await kv.list({
    prefix,
    limit: options.limit ?? 1000,
    cursor: options.cursor,
  });

  const cards: Array<{
    key: string;
    value: Record<string, unknown>;
    playerData: Record<string, unknown> | null;
  }> = [];

  for (const key of listResult.keys) {
    const value = await kv.get(key.name);
    if (value) {
      try {
        const cardData = JSON.parse(value) as Record<string, unknown>;
        const parsed = parseUserCardKey(key.name);

        let playerData: Record<string, unknown> | null = null;

        // Recupera dati giocatore se abbiamo clubCode e cardSlug
        if (parsed) {
          // Estrai playerSlug corretto per il match con il database
          // Logica: se card.slug contiene data di nascita, estrai lo slug corretto
          //         altrimenti usa card.playerSlug
          let playerSlug: string;
          
          if (cardData.slug && /\d{4}-\d{2}-\d{2}/.test(cardData.slug as string)) {
            // Caso con data di nascita: estrai lo slug corretto dal cardSlug
            // es: "andrew-thomas-1998-09-01-2025-limited-211" → "andrew-thomas-1998-09-01"
            playerSlug = extractCorrectPlayerSlug(
              cardData.slug as string,
              cardData.playerSlug as string
            );
          } else {
            // Caso senza data: usa playerSlug direttamente
            // es: "oumar-solet-bomawoko-2021-limited-246" → "oumar-solet-bomawoko"
            playerSlug = cardData.playerSlug as string;
          }
          
          if (playerSlug) {
            const playerKey = `${parsed.clubCode}:${playerSlug}`;
            const playerValue = await kv.get(playerKey);
            
            if (playerValue) {
              try {
                playerData = JSON.parse(playerValue) as Record<string, unknown>;
              } catch (e) {
                console.error(`Failed to parse player ${playerKey}:`, e);
              }
            }
          }
        }

        cards.push({
          key: key.name,
          value: cardData,
          playerData: sanitizePlayerData(playerData),
        });
      } catch (e) {
        console.error(`Failed to parse card ${key.name}:`, e);
      }
    }
  }

  return {
    cards: cards.map((c) => ({ ...c, value: sanitizeCardData(c.value) })),
    cursor: listResult.list_complete ? undefined : listResult.cursor,
    complete: listResult.list_complete,
  };
}

/**
 * Elimina una carta
 */
export async function deleteUserCard(
  kv: KVNamespace,
  key: string
): Promise<CardOperationResult> {
  try {
    // Verifica che sia una key valida
    const parsed = parseUserCardKey(key);
    if (!parsed) {
      return {
        success: false,
        key,
        error: "Invalid card key format",
      };
    }

    await kv.delete(key);
    return { success: true, key };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, key, error: msg };
  }
}

/**
 * Recupera una singola carta tramite key con dati giocatore innestati
 */
export async function getUserCard(
  kv: KVNamespace,
  key: string
): Promise<{ success: boolean; card?: { key: string; value: Record<string, unknown>; playerData: Record<string, unknown> | null }; error?: string }> {
  try {
    const value = await kv.get(key);
    if (!value) {
      return {
        success: false,
        error: "Card not found",
      };
    }

    const cardData = JSON.parse(value) as Record<string, unknown>;
    
    // Estrai clubCode e playerSlug dalla key per recuperare i dati giocatore
    const parsed = parseUserCardKey(key);
    let playerData: Record<string, unknown> | null = null;
    
    if (parsed) {
      // Estrai playerSlug corretto per il match con il database
      // Logica: se card.slug contiene data di nascita, estrai lo slug corretto
      //         altrimenti usa card.playerSlug
      let playerSlug: string;
      
      if (cardData.slug && /\d{4}-\d{2}-\d{2}/.test(cardData.slug as string)) {
        // Caso con data di nascita: estrai lo slug corretto dal cardSlug
        // es: "andrew-thomas-1998-09-01-2025-limited-211" → "andrew-thomas-1998-09-01"
        playerSlug = extractCorrectPlayerSlug(
          cardData.slug as string,
          cardData.playerSlug as string
        );
      } else {
        // Caso senza data: usa playerSlug direttamente
        // es: "oumar-solet-bomawoko-2021-limited-246" → "oumar-solet-bomawoko"
        playerSlug = cardData.playerSlug as string;
      }
      
      if (playerSlug) {
        const playerKey = `${parsed.clubCode}:${playerSlug}`;
        const playerValue = await kv.get(playerKey);
        
        if (playerValue) {
          try {
            playerData = JSON.parse(playerValue) as Record<string, unknown>;
          } catch (e) {
            console.error(`Failed to parse player ${playerKey}:`, e);
          }
        }
      }
    }

    return {
      success: true,
      card: {
        key,
        value: sanitizeCardData(cardData),
        playerData: sanitizePlayerData(playerData),
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Conta le carte di un utente
 */
export async function countUserCards(
  kv: KVNamespace,
  userId: string,
  clubCode?: string
): Promise<number> {
  const prefix = clubCode ? `USR_${userId}:${clubCode}:` : `USR_${userId}:`;

  let count = 0;
  let cursor: string | undefined;

  do {
    const result = await kv.list({ prefix, cursor, limit: 1000 });
    count += result.keys.length;
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return count;
}
