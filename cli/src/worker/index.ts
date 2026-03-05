/**
 * Cloudflare Worker - MLS Player Data Sync
 * 
 * Schedulazione:
 * - Martedì 08:00 UTC: extract-players (nuovi giocatori)
 * - Mercoledì 08:00 UTC: analyze-homeaway + analyze-aa
 * - Giovedì-Domenica ogni 4h: analyze-odds
 * 
 * Environment:
 * - MLS_PLAYERS: KV Namespace per i dati giocatori
 * - SORARE_API_KEY: API key per Sorare GraphQL
 */

import { createKVRepository } from "./lib/kv-repository.js";
import { createSorareClient } from "./lib/sorare-client.js";
import { extractPlayersHandler } from "./handlers/extract-players.js";
import { analyzeHomeAwayHandler } from "./handlers/analyze-homeaway.js";
import { analyzeAAHandler } from "./handlers/analyze-aa.js";
import { analyzeOddsHandler } from "./handlers/analyze-odds.js";
import {
  saveUserCard,
  saveUserCardsBatch,
  getUserCards,
  getUserCardsWithPlayerData,
  deleteUserCard,
  countUserCards,
  parseUserCardKey,
  type SaveCardRequest,
  type SaveBatchRequest,
} from "./handlers/user-cards.js";

export interface Env {
  MLS_PLAYERS: KVNamespace;
  SORARE_API_KEY: string;
}

/**
 * Router per i cron job
 * Mappa le espressioni cron agli handler appropriati
 */
async function handleCron(cron: string, env: Env): Promise<void> {
  console.log(`🔔 Cron triggered: ${cron}`);

  const repository = createKVRepository(env.MLS_PLAYERS);
  const client = createSorareClient(env);

  // Verifica API key
  if (!env.SORARE_API_KEY) {
    console.error("❌ SORARE_API_KEY not configured");
    throw new Error("SORARE_API_KEY not configured");
  }

  switch (cron) {
    // Martedì 08:00 UTC - Extract players
    case "0 8 * * 2":
      console.log("📋 Running extract-players...");
      await extractPlayersHandler(repository, client);
      break;

    // Mercoledì 08:00 UTC - Analyze home/away + AA
    case "0 8 * * 3":
      console.log("📊 Running analyze-homeaway...");
      await analyzeHomeAwayHandler(repository, client);
      console.log("📊 Running analyze-aa...");
      await analyzeAAHandler(repository, client);
      break;

    // Giovedì 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC - Odds
    case "0 0 * * 4":
    case "0 4 * * 4":
    case "0 8 * * 4":
    case "0 12 * * 4":
    case "0 16 * * 4":
    case "0 20 * * 4":
    // Venerdì
    case "0 0 * * 5":
    case "0 4 * * 5":
    case "0 8 * * 5":
    case "0 12 * * 5":
    case "0 16 * * 5":
    case "0 20 * * 5":
    // Sabato
    case "0 0 * * 6":
    case "0 4 * * 6":
    case "0 8 * * 6":
    case "0 12 * * 6":
    case "0 16 * * 6":
    case "0 20 * * 6":
    // Domenica
    case "0 0 * * 7":
    case "0 4 * * 7":
    case "0 8 * * 7":
    case "0 12 * * 7":
    case "0 16 * * 7":
    case "0 20 * * 7":
      console.log("🎲 Running analyze-odds...");
      await analyzeOddsHandler(repository, client);
      break;

    default:
      console.log(`⚠️ Unknown cron: ${cron}`);
  }
}

/**
 * HTTP handler per health check e trigger manuali
 */
async function handleFetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Health check
    if (path === "/" || path === "/health") {
      const playerCount = await createKVRepository(env.MLS_PLAYERS).countPlayers();
      
      return json({
        status: "ok",
        service: "mls-player-sync",
        players: playerCount,
        timestamp: new Date().toISOString(),
      }, headers);
    }

    // Trigger manuale (richiede metodo POST)
    if (path === "/trigger" && request.method === "POST") {
      const body = await request.json<{ job?: string }>().catch(() => ({})) as { job?: string };
      const job = body.job;

      if (!job || !["extract-players", "analyze-homeaway", "analyze-aa", "analyze-odds"].includes(job)) {
        return json({ error: "Unknown job. Use: extract-players, analyze-homeaway, analyze-aa, analyze-odds" }, headers, 400);
      }

      // Esecuzione sincrona
      const repository = createKVRepository(env.MLS_PLAYERS);
      const client = createSorareClient(env);
      let result: unknown;

      switch (job) {
        case "extract-players":
          result = await extractPlayersHandler(repository, client);
          break;
        case "analyze-homeaway":
          result = await analyzeHomeAwayHandler(repository, client);
          break;
        case "analyze-aa":
          result = await analyzeAAHandler(repository, client);
          break;
        case "analyze-odds":
          result = await analyzeOddsHandler(repository, client);
          break;
      }

      return json({
        success: true,
        job,
        result,
        timestamp: new Date().toISOString(),
      }, headers);
    }

    // Status dettagliato
    if (path === "/status") {
      const repository = createKVRepository(env.MLS_PLAYERS);
      const db = await repository.load();
      
      const withHomeAway = db.players.filter(p => p.stats?.homeAwayAnalysis).length;
      const withAA = db.players.filter(p => p.stats?.aaAnalysis).length;
      const withOdds = db.players.filter(p => p.stats?.odds?.nextFixture?.startingOdds).length;

      return json({
        totalPlayers: db.totalPlayers,
        totalClubs: db.totalClubs,
        withHomeAwayAnalysis: withHomeAway,
        withAAAnalysis: withAA,
        withOdds: withOdds,
        season: db.season,
        extractedAt: db.extractedAt,
      }, headers);
    }

    // ============================================
    // USER CARDS API
    // ============================================

    // POST /api/cards - Salva singola carta (+ invalida cache)
    if (path === "/api/cards" && request.method === "POST") {
      const body = await request.json<SaveCardRequest>().catch(() => null);
      
      if (!body || !body.userId || !body.clubCode || !body.playerSlug) {
        return json({ 
          error: "Invalid request. Required: userId, clubCode, playerSlug, cardData" 
        }, headers, 400);
      }

      const result = await saveUserCard(env.MLS_PLAYERS, body);
      
      // Invalida cache per questo utente
      if (result.success) {
        await invalidateUserCache(env.MLS_PLAYERS, body.userId);
      }
      
      return json(result, headers, result.success ? 200 : 500);
    }

    // POST /api/cards/batch - Salva batch di carte (+ invalida cache)
    if (path === "/api/cards/batch" && request.method === "POST") {
      const body = await request.json<SaveBatchRequest>().catch(() => null);
      
      if (!body || !Array.isArray(body.cards) || body.cards.length === 0) {
        return json({ 
          error: "Invalid request. Required: cards (array)" 
        }, headers, 400);
      }

      // Limite batch per sicurezza
      if (body.cards.length > 500) {
        return json({ 
          error: "Batch too large. Max 500 cards per request." 
        }, headers, 400);
      }

      const result = await saveUserCardsBatch(env.MLS_PLAYERS, body.cards);
      
      // Invalida cache per tutti gli utenti univoci nel batch
      const uniqueUsers = new Set(body.cards.map(c => c.userId));
      for (const userId of uniqueUsers) {
        await invalidateUserCache(env.MLS_PLAYERS, userId);
      }
      
      return json({
        success: result.errorCount === 0,
        summary: {
          total: body.cards.length,
          success: result.successCount,
          errors: result.errorCount,
        },
        results: result.results,
      }, headers);
    }

    // GET /api/cards - Lista carte utente (CACHED)
    if (path === "/api/cards" && request.method === "GET") {
      return getCachedOrFetch(request, async () => {
        const userId = url.searchParams.get("userId");
        const clubCode = url.searchParams.get("clubCode") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "1000", 10);
        const cursor = url.searchParams.get("cursor") || undefined;
        
        if (!userId) {
          return json({ error: "Missing required parameter: userId" }, headers, 400);
        }

        const result = await getUserCards(env.MLS_PLAYERS, userId, {
          clubCode,
          limit: Math.min(limit, 1000), // Max 1000
          cursor,
        });

        return json({
          userId,
          count: result.cards.length,
          complete: result.complete,
          cursor: result.cursor,
          cards: result.cards,
        }, headers);
      });
    }

    // GET /api/cards/with-players - Lista carte con dati giocatore (CACHED)
    if (path === "/api/cards/with-players" && request.method === "GET") {
      return getCachedOrFetch(request, async () => {
        const userId = url.searchParams.get("userId");
        const clubCode = url.searchParams.get("clubCode") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "1000", 10);
        const cursor = url.searchParams.get("cursor") || undefined;
        
        if (!userId) {
          return json({ error: "Missing required parameter: userId" }, headers, 400);
        }

        const result = await getUserCardsWithPlayerData(env.MLS_PLAYERS, userId, {
          clubCode,
          limit: Math.min(limit, 1000), // Max 1000
          cursor,
        });

        return json({
          userId,
          count: result.cards.length,
          complete: result.complete,
          cursor: result.cursor,
          cards: result.cards,
        }, headers);
      });
    }

    // GET /api/cards/count - Conta carte utente (CACHED)
    if (path === "/api/cards/count" && request.method === "GET") {
      return getCachedOrFetch(request, async () => {
        const userId = url.searchParams.get("userId");
        const clubCode = url.searchParams.get("clubCode") || undefined;
        
        if (!userId) {
          return json({ error: "Missing required parameter: userId" }, headers, 400);
        }

        const count = await countUserCards(env.MLS_PLAYERS, userId, clubCode);

        return json({ userId, clubCode, count }, headers);
      });
    }

    // DELETE /api/cards/:key - Elimina carta (+ invalida cache)
    const deleteCardMatch = path.match(/^\/api\/cards\/(.+)$/);
    if (deleteCardMatch && request.method === "DELETE") {
      const key = decodeURIComponent(deleteCardMatch[1]);
      
      // Estrai userId dalla key per invalidare la cache
      const parsed = parseUserCardKey(key);
      
      const result = await deleteUserCard(env.MLS_PLAYERS, key);
      
      // Invalida cache per questo utente
      if (result.success && parsed) {
        await invalidateUserCache(env.MLS_PLAYERS, parsed.userId);
      }
      
      return json(result, headers, result.success ? 200 : 400);
    }

    return json({ error: "Not found" }, headers, 404);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Handler error:", msg);
    return json({ error: msg }, headers, 500);
  }
}

function json(data: unknown, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 86400; // 24 ore
const CACHE_CONTROL_HEADER = `public, max-age=${CACHE_TTL_SECONDS}`;

/**
 * Crea una cache key dalla richiesta
 */
function createCacheKey(request: Request): Request {
  const url = new URL(request.url);
  // Rimuovi query params che non influenzano il contenuto
  return new Request(url.toString(), request);
}

/**
 * Recupera dalla cache o esegue la funzione e salva in cache
 */
async function getCachedOrFetch(
  request: Request,
  fetcher: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = createCacheKey(request);
  
  // Prova a recuperare dalla cache
  const cached = await cache.match(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT] ${request.url}`);
    return cached;
  }
  
  // Esegui la funzione
  const response = await fetcher();
  
  // Salva in cache solo se la risposta è OK
  if (response.status === 200) {
    // Clona la risposta per poterla salvare in cache (la response può essere consumata solo una volta)
    const responseToCache = response.clone();
    
    // Aggiungi header cache-control se non presente
    const headers = new Headers(responseToCache.headers);
    headers.set("Cache-Control", CACHE_CONTROL_HEADER);
    
    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers,
    });
    
    await cache.put(cacheKey, cachedResponse);
    console.log(`[CACHE MISS] ${request.url} - Saved to cache`);
  }
  
  return response;
}

/**
 * Invalida la cache per un utente specifico
 * Da chiamare quando si modificano i dati (POST/DELETE)
 */
async function invalidateUserCache(kv: KVNamespace, userId: string): Promise<void> {
  const cache = caches.default;
  
  // Invalida tutte le possibili URL per questo utente
  const baseUrls = [
    `/api/cards?userId=${userId}`,
    `/api/cards/count?userId=${userId}`,
  ];
  
  // Ottieni i club dell'utente per invalidare anche quelli specifici
  const { clubs } = await getUserCards(kv, userId, { limit: 1000 });
  const uniqueClubs = new Set(clubs.map(c => c.value.clubCode as string));
  
  for (const clubCode of uniqueClubs) {
    baseUrls.push(`/api/cards?userId=${userId}&clubCode=${clubCode}`);
    baseUrls.push(`/api/cards/with-players?userId=${userId}&clubCode=${clubCode}`);
  }
  
  // Non possiamo sapere tutte le combinazioni con cursor, ma le prime pagine sono le più importanti
  baseUrls.push(`/api/cards/with-players?userId=${userId}`);
  
  // Cancella dalla cache
  for (const path of baseUrls) {
    const url = `https://sorare-mls-sync.loziobiz.workers.dev${path}`;
    try {
      await cache.delete(new Request(url));
      console.log(`[CACHE INVALIDATE] ${url}`);
    } catch (e) {
      // Ignora errori di delete (potrebbe non esistere)
    }
  }
}

/**
 * Worker entry point
 */
export default {
  /**
   * Handler per richieste HTTP
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    console.log(`[HTTP] ${request.method} ${request.url}`);
    return handleFetch(request, env, ctx);
  },

  /**
   * Handler per cron triggers
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[CRON] Triggered: ${controller.cron} at ${new Date().toISOString()}`);
    
    // ctx.waitUntil garantisce che il Worker continui a eseguire
    // anche dopo il ritorno della funzione
    ctx.waitUntil(
      handleCron(controller.cron, env).catch((error) => {
        console.error("Cron handler failed:", error);
        throw error;
      })
    );
  },
};
