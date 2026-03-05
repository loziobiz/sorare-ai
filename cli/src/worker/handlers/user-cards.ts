/**
 * User Cards Handler
 * 
 * Gestisce il salvataggio e recupero delle carte utente in KV.
 * Key format: USR_{USER_ID}:{CLUB_CODE}:{PLAYER_SLUG}
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
 * Format: USR_{USER_ID}:{CLUB_CODE}:{PLAYER_SLUG}
 */
export function makeUserCardKey(userId: string, clubCode: string, playerSlug: string): string {
  return `USR_${userId}:${clubCode}:${playerSlug}`;
}

/**
 * Parse una key carta utente
 */
export function parseUserCardKey(key: string): { userId: string; clubCode: string; playerSlug: string } | null {
  if (!key.startsWith("USR_")) return null;
  
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  
  const userId = parts[0].replace("USR_", "");
  return {
    userId,
    clubCode: parts[1],
    playerSlug: parts[2],
  };
}

/**
 * Salva una singola carta
 */
export async function saveUserCard(
  kv: KVNamespace,
  card: SaveCardRequest
): Promise<CardOperationResult> {
  try {
    const key = makeUserCardKey(card.userId, card.clubCode, card.playerSlug);
    
    const value = {
      ...card.cardData,
      userId: card.userId,
      clubCode: card.clubCode,
      playerSlug: card.playerSlug,
      savedAt: new Date().toISOString(),
    };
    
    await kv.put(key, JSON.stringify(value));
    
    return { success: true, key };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      key: makeUserCardKey(card.userId, card.clubCode, card.playerSlug),
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
    cards,
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
        
        // Recupera dati giocatore se abbiamo clubCode e playerSlug
        if (parsed) {
          const playerKey = `${parsed.clubCode}:${parsed.playerSlug}`;
          const playerValue = await kv.get(playerKey);
          if (playerValue) {
            try {
              playerData = JSON.parse(playerValue) as Record<string, unknown>;
            } catch (e) {
              console.error(`Failed to parse player ${playerKey}:`, e);
            }
          }
        }
        
        cards.push({
          key: key.name,
          value: cardData,
          playerData,
        });
      } catch (e) {
        console.error(`Failed to parse card ${key.name}:`, e);
      }
    }
  }
  
  return {
    cards,
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
 * Conta le carte di un utente
 */
export async function countUserCards(
  kv: KVNamespace,
  userId: string,
  clubCode?: string
): Promise<number> {
  const prefix = clubCode
    ? `USR_${userId}:${clubCode}:`
    : `USR_${userId}:`;
  
  let count = 0;
  let cursor: string | undefined;
  
  do {
    const result = await kv.list({ prefix, cursor, limit: 1000 });
    count += result.keys.length;
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
  
  return count;
}
