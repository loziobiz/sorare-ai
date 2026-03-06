/**
 * Cloudflare Worker - MLS Player Data Sync
 *
 * Schedulazione:
 * - Martedì 08:00 UTC: extract-players (nuovi giocatori)
 * - Mercoledì 08:00 UTC: analyze-homeaway + analyze-aa
 * - Giovedì-Domenica ogni 4h: analyze-odds
 *
 * Environment:
 * - SORARE_AI_DATA: KV Namespace per i dati giocatori
 * - SORARE_API_KEY: API key per Sorare GraphQL
 */

import { analyzeAAHandler } from "./handlers/analyze-aa.js";
import { analyzeHomeAwayHandler } from "./handlers/analyze-homeaway.js";
import { analyzeOddsHandler } from "./handlers/analyze-odds.js";
import { extractPlayersHandler } from "./handlers/extract-players.js";
import { syncExtraPlayersHandler } from "./handlers/sync-extra-players.js";
import {
  countUserCards,
  deleteUserCard,
  getUserCard,
  getUserCards,
  getUserCardsWithPlayerData,
  parseUserCardKey,
  type SaveBatchRequest,
  type SaveCardRequest,
  saveUserCard,
  saveUserCardsBatch,
} from "./handlers/user-cards.js";
import { createKVRepository } from "./lib/kv-repository.js";
import { createSorareClient } from "./lib/sorare-client.js";

export interface Env {
  SORARE_AI_DATA: KVNamespace;
  SORARE_API_KEY: string;
}

/**
 * Router per i cron job
 * Mappa le espressioni cron agli handler appropriati
 */
async function handleCron(cron: string, env: Env): Promise<void> {
  console.log(`🔔 Cron triggered: ${cron}`);

  const repository = createKVRepository(env.SORARE_AI_DATA);
  const client = createSorareClient(env);

  // Verifica API key
  if (!env.SORARE_API_KEY) {
    console.error("❌ SORARE_API_KEY not configured");
    throw new Error("SORARE_API_KEY not configured");
  }

  switch (cron) {
    // Martedì 08:00 UTC - Extract players (MLS)
    case "0 8 * * 2":
      console.log("📋 Running extract-players...");
      await extractPlayersHandler(repository, client);
      console.log("🌐 Running sync-extra-players...");
      await syncExtraPlayersHandler(repository, client);
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
async function handleFetch(
  request: Request,
  env: Env,
  ctx?: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Health check
    if (path === "/" || path === "/health") {
      const playerCount = await createKVRepository(
        env.SORARE_AI_DATA
      ).countPlayers();

      return json(
        {
          status: "ok",
          service: "mls-player-sync",
          players: playerCount,
          timestamp: new Date().toISOString(),
        },
        headers
      );
    }

    // GET /debug/player?slug=xxx - Debug dati giocatore
    if (path === "/debug/player" && request.method === "GET") {
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return json({ error: "Missing slug parameter" }, headers, 400);
      }

      const repository = createKVRepository(env.SORARE_AI_DATA);
      const player = await repository.findBySlug(slug);

      return json(
        {
          found: !!player,
          slug,
          player: player
            ? {
                slug: player.slug,
                name: player.name,
                clubCode: player.clubCode,
                hasAA: !!player.stats?.aaAnalysis,
                aaAnalysis: player.stats?.aaAnalysis || null,
              }
            : null,
        },
        headers
      );
    }

    // Trigger manuale (richiede metodo POST)
    if (path === "/trigger" && request.method === "POST") {
      const body = (await request
        .json<{ job?: string }>()
        .catch(() => ({}))) as { job?: string };
      const job = body.job;

      if (
        !(
          job &&
          [
            "extract-players",
            "sync-extra-players",
            "analyze-homeaway",
            "analyze-aa",
            "analyze-odds",
          ].includes(job)
        )
      ) {
        return json(
          {
            error:
              "Unknown job. Use: extract-players, sync-extra-players, analyze-homeaway, analyze-aa, analyze-odds",
          },
          headers,
          400
        );
      }

      // Esecuzione sincrona
      const repository = createKVRepository(env.SORARE_AI_DATA);
      const client = createSorareClient(env);
      let result: unknown;

      switch (job) {
        case "extract-players":
          result = await extractPlayersHandler(repository, client);
          break;
        case "sync-extra-players":
          result = await syncExtraPlayersHandler(repository, client);
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

      return json(
        {
          success: true,
          job,
          result,
          timestamp: new Date().toISOString(),
        },
        headers
      );
    }

    // Status dettagliato
    if (path === "/status") {
      const repository = createKVRepository(env.SORARE_AI_DATA);
      const db = await repository.load();

      const withHomeAway = db.players.filter(
        (p) => p.stats?.homeAwayAnalysis
      ).length;
      const withAA = db.players.filter((p) => p.stats?.aaAnalysis).length;
      const withOdds = db.players.filter(
        (p) => p.stats?.odds?.nextFixture?.startingOdds
      ).length;

      return json(
        {
          totalPlayers: db.totalPlayers,
          totalClubs: db.totalClubs,
          withHomeAwayAnalysis: withHomeAway,
          withAAAnalysis: withAA,
          withOdds,
          season: db.season,
          extractedAt: db.extractedAt,
        },
        headers
      );
    }

    // ============================================
    // USER CARDS API
    // ============================================

    // POST /api/cards - Salva singola carta (+ invalida cache)
    if (path === "/api/cards" && request.method === "POST") {
      const body = await request.json<SaveCardRequest>().catch(() => null);

      if (!(body && body.userId && body.clubCode && body.playerSlug)) {
        return json(
          {
            error:
              "Invalid request. Required: userId, clubCode, playerSlug, cardData (with slug)",
          },
          headers,
          400
        );
      }

      // Verifica che cardData.slug esista (obbligatorio per la chiave)
      if (!body.cardData?.slug) {
        return json(
          {
            error:
              "Invalid request. cardData.slug is required (e.g., 'matteo-meisl-2023-limited-169')",
          },
          headers,
          400
        );
      }

      const result = await saveUserCard(env.SORARE_AI_DATA, body);

      // Invalida cache per questo utente
      if (result.success) {
        await invalidateUserCache(env.SORARE_AI_DATA, body.userId);
      }

      // Attendi operazioni background (es. aggiunta a extra players) usando waitUntil
      if (result.backgroundWork && ctx) {
        ctx.waitUntil(result.backgroundWork);
      }

      return json(result, headers, result.success ? 200 : 500);
    }

    // POST /api/cards/batch - Salva batch di carte (+ invalida cache)
    if (path === "/api/cards/batch" && request.method === "POST") {
      const body = await request.json<SaveBatchRequest>().catch(() => null);

      if (!(body && Array.isArray(body.cards)) || body.cards.length === 0) {
        return json(
          {
            error: "Invalid request. Required: cards (array)",
          },
          headers,
          400
        );
      }

      // Limite batch per sicurezza
      if (body.cards.length > 500) {
        return json(
          {
            error: "Batch too large. Max 500 cards per request.",
          },
          headers,
          400
        );
      }

      const result = await saveUserCardsBatch(env.SORARE_AI_DATA, body.cards);

      // Invalida cache per tutti gli utenti univoci nel batch
      const uniqueUsers = new Set(body.cards.map((c) => c.userId));
      for (const userId of uniqueUsers) {
        await invalidateUserCache(env.SORARE_AI_DATA, userId);
      }

      return json(
        {
          success: result.errorCount === 0,
          summary: {
            total: body.cards.length,
            success: result.successCount,
            errors: result.errorCount,
          },
          results: result.results,
        },
        headers
      );
    }

    // GET /api/cards - Lista carte utente (NO CACHE)
    if (path === "/api/cards" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      const clubCode = url.searchParams.get("clubCode") || undefined;
      const limit = Number.parseInt(
        url.searchParams.get("limit") || "1000",
        10
      );
      const cursor = url.searchParams.get("cursor") || undefined;

      if (!userId) {
        return json(
          { error: "Missing required parameter: userId" },
          headers,
          400
        );
      }

      const result = await getUserCards(env.SORARE_AI_DATA, userId, {
        clubCode,
        limit: Math.min(limit, 1000), // Max 1000
        cursor,
      });

      return json(
        {
          userId,
          count: result.cards.length,
          complete: result.complete,
          cursor: result.cursor,
          cards: result.cards,
        },
        headers
      );
    }

    // GET /api/cards/with-players - Lista carte con dati giocatore (CACHED)
    if (path === "/api/cards/with-players" && request.method === "GET") {
      return getCachedOrFetch(request, async () => {
        const userId = url.searchParams.get("userId");
        const clubCode = url.searchParams.get("clubCode") || undefined;
        const limit = Number.parseInt(
          url.searchParams.get("limit") || "1000",
          10
        );
        const cursor = url.searchParams.get("cursor") || undefined;

        if (!userId) {
          return json(
            { error: "Missing required parameter: userId" },
            headers,
            400
          );
        }

        const result = await getUserCardsWithPlayerData(
          env.SORARE_AI_DATA,
          userId,
          {
            clubCode,
            limit: Math.min(limit, 1000), // Max 1000
            cursor,
          }
        );

        return json(
          {
            userId,
            count: result.cards.length,
            complete: result.complete,
            cursor: result.cursor,
            cards: result.cards,
          },
          headers
        );
      });
    }

    // GET /api/cards/count - Conta carte utente (NO CACHE)
    if (path === "/api/cards/count" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      const clubCode = url.searchParams.get("clubCode") || undefined;

      if (!userId) {
        return json(
          { error: "Missing required parameter: userId" },
          headers,
          400
        );
      }

      const count = await countUserCards(env.SORARE_AI_DATA, userId, clubCode);

      return json({ userId, clubCode, count }, headers);
    }

    // GET /api/cards/single?userId=xxx&slug=xxx - Recupera singola carta
    if (path === "/api/cards/single" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      const clubCode = url.searchParams.get("clubCode");
      const slug = url.searchParams.get("slug");

      if (!(userId && clubCode && slug)) {
        return json(
          {
            error: "Missing required query parameters: userId, clubCode, slug",
          },
          headers,
          400
        );
      }

      const key = `USR_${userId}:${clubCode}:${slug}`;
      const result = await getUserCard(env.SORARE_AI_DATA, key);
      return json(result, headers, result.success ? 200 : 404);
    }

    // POST /api/cache/invalidate - Invalida cache manuale
    if (path === "/api/cache/invalidate" && request.method === "POST") {
      const userId = url.searchParams.get("userId");

      if (!userId) {
        return json(
          { error: "Missing required query parameter: userId" },
          headers,
          400
        );
      }

      const invalidatedUrls = await invalidateUserCache(
        env.SORARE_AI_DATA,
        userId
      );

      return json(
        {
          success: true,
          message: `Cache invalidated for user: ${userId}`,
          invalidatedUrls,
          timestamp: new Date().toISOString(),
        },
        headers
      );
    }

    // DELETE /api/cards/:key - Elimina carta (+ invalida cache)
    const deleteCardMatch = path.match(/^\/api\/cards\/(.+)$/);
    if (deleteCardMatch && request.method === "DELETE") {
      const key = decodeURIComponent(deleteCardMatch[1]);

      // Estrai userId dalla key per invalidare la cache
      const parsed = parseUserCardKey(key);

      const result = await deleteUserCard(env.SORARE_AI_DATA, key);

      // Invalida cache per questo utente
      if (result.success && parsed) {
        await invalidateUserCache(env.SORARE_AI_DATA, parsed.userId);
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
const CACHE_TTL_SECONDS = 86_400; // 24 ore
const CACHE_CONTROL_HEADER = `public, max-age=${CACHE_TTL_SECONDS}`;

/**
 * Crea una cache key dalla richiesta
 * La chiave è SOLO l'URL, senza header (altrimenti invalidazione non funziona)
 */
function createCacheKey(request: Request): Request {
  const url = new URL(request.url);
  // Crea una request con SOLO l'URL e metodo GET, nessun header
  return new Request(url.toString(), { method: "GET" });
}

/**
 * Recupera dalla cache o esegue la funzione e salva in cache
 */
async function getCachedOrFetch(
  request: Request,
  fetcher: () => Promise<Response>
): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = createCacheKey(request);

  // Prova a recuperare dalla cache
  const cached = await cache.match(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT] ${request.url}`);
    // Aggiungi header di debug
    const responseWithHeader = new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: {
        ...Object.fromEntries(cached.headers.entries()),
        "X-Cache-Status": "HIT",
      },
    });
    return responseWithHeader;
  }

  // Esegui la funzione
  const response = await fetcher();

  // Salva in cache solo se la risposta è OK
  if (response.status === 200) {
    // Clona la risposta per poterla salvare in cache (la response può essere consumata solo una volta)
    const responseToCache = response.clone();

    // Salva in cache SENZA Cache-Control header
    // Se mettiamo Cache-Control, la CDN mette in cache e l'invalidazione non funziona
    await cache.put(cacheKey, responseToCache);
    console.log(`[CACHE MISS] ${request.url} - Saved to cache`);

    // Aggiungi header di debug
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "X-Cache-Status": "MISS",
      },
    });
  }

  return response;
}

/**
 * Invalida la cache per un utente specifico
 * Invalida SOLO /api/cards/with-players?userId={userId}
 */
async function invalidateUserCache(
  kv: KVNamespace,
  userId: string
): Promise<string[]> {
  const cache = (caches as unknown as { default: Cache }).default;

  // Invalida SOLO l'URL con with-players senza filtri
  const urlString = `https://sorare-mls-sync.loziobiz.workers.dev/api/cards/with-players?userId=${userId}`;

  // Usa la STESSA logica di createCacheKey per garantire match esatto
  // Normalizza l'URL attraverso URL class come fa createCacheKey
  const url = new URL(urlString);
  const cacheKey = new Request(url.toString(), { method: "GET" });

  try {
    const deleted = await cache.delete(cacheKey);
    console.log(`[CACHE INVALIDATE] ${url.toString()} - Success: ${deleted}`);
  } catch (e) {
    console.error(`[CACHE INVALIDATE ERROR] ${url.toString()}:`, e);
  }

  return [url.toString()];
}

/**
 * Worker entry point
 */
export default {
  /**
   * Handler per richieste HTTP
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    console.log(`[HTTP] ${request.method} ${request.url}`);
    return handleFetch(request, env, ctx);
  },

  /**
   * Handler per cron triggers
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(
      `[CRON] Triggered: ${controller.cron} at ${new Date().toISOString()}`
    );

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
