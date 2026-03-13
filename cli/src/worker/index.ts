/**
 * Cloudflare Worker - MLS Player Data Sync
 *
 * Schedulazione:
 * - Tutti i giorni 06:00, 18:00 UTC: sync-user-cards (sync carte ogni 12 ore)
 * - Mercoledì 08:00 UTC: extract-players (nuovi giocatori MLS)
 * - Martedì e Venerdì 16:00 UTC: analyze-homeaway + analyze-aa
 * - Tutti i giorni 00:00, 08:00, 16:00 UTC: analyze-odds (ogni 8 ore)
 *
 * Environment:
 * - SORARE_AI_DATA: KV Namespace per i dati giocatori
 * - SORARE_API_KEY: API key per Sorare GraphQL
 */

import { KV_CARDS_BATCH_SIZE } from "../../../shared/kv-constants.js";
import { analyzeAAHandler } from "./handlers/analyze-aa.js";
import { analyzeHomeAwayHandler } from "./handlers/analyze-homeaway.js";
import { analyzeOddsHandler } from "./handlers/analyze-odds.js";
import { cleanupExpiredOddsHandler } from "./handlers/cleanup-expired-odds.js";
import { extractPlayersHandler } from "./handlers/extract-players.js";
import {
  createFormation,
  deleteFormation,
  listFormations,
  type SaveFormationRequest,
  updateFormation,
} from "./handlers/formations.js";
import { syncExtraPlayersHandler } from "./handlers/sync-extra-players.js";
import { syncUserCardsHandler } from "./handlers/sync-user-cards.js";
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
import { getUserSyncStatus, saveUserJWT } from "./handlers/user-jwt.js";
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
    // Ogni giorno 06:00, 18:00 UTC - Sync user cards (ogni 12 ore)
    case "0 6 * * *":
    case "0 18 * * *":
      console.log("🔄 Running sync-user-cards...");
      await syncUserCardsHandler(env.SORARE_AI_DATA, client);
      break;

    // Tutti i giorni 08:30 UTC - Cleanup expired odds
    case "30 8 * * *":
      console.log("🧹 Running cleanup-expired-odds...");
      await cleanupExpiredOddsHandler(repository);
      break;

    // Mercoledì 08:00 UTC - Extract players (MLS)
    case "0 8 * * 3":
      console.log("📋 Running extract-players...");
      await extractPlayersHandler(repository, client);
      console.log("🌐 Running sync-extra-players...");
      await syncExtraPlayersHandler(repository, client);
      break;

    // Martedì e Venerdì 16:00 UTC - Analyze home/away + AA
    case "0 16 * * 2":
    case "0 16 * * 5":
      console.log("📊 Running analyze-homeaway...");
      await analyzeHomeAwayHandler(repository, client);
      console.log("📊 Running analyze-aa...");
      await analyzeAAHandler(repository, client);
      break;

    // Ogni giorno alle 00:00, 08:00, 16:00 UTC - Odds (ogni 8 ore)
    // Cloudflare passa i cron espansi individualmente
    case "0 0 * * *":
    case "0 8 * * *":
    case "0 16 * * *": {
      // Evita di eseguire alle 8 del mercoledì (già gestito sopra) e alle 16 di martedì/venerdì
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const hour = now.getUTCHours();

      // Salta se è mercoledì 8:00 (extract-players) o martedì/venerdì 16:00 (analyze-homeaway)
      if (hour === 8 && dayOfWeek === 3) {
        console.log("⏭️ Skipping odds analysis - extract-players slot");
        break;
      }
      if (hour === 16 && (dayOfWeek === 2 || dayOfWeek === 5)) {
        console.log("⏭️ Skipping odds analysis - homeaway/aa slot");
        break;
      }

      console.log("🎲 Running analyze-odds...");
      await analyzeOddsHandler(repository, client);
      break;
    }

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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    // POST /api/user/jwt - Salva il JWT dell'utente
    if (path === "/api/user/jwt" && request.method === "POST") {
      const body = (await request
        .json<{ userId?: string; token?: string }>()
        .catch(() => ({}))) as {
        userId?: string;
        token?: string;
      };

      if (!(body.userId && body.token)) {
        return json({ error: "Required: userId, token" }, headers, 400);
      }

      try {
        await saveUserJWT(env.SORARE_AI_DATA, body.userId, body.token);
        return json(
          { success: true, message: "JWT saved successfully" },
          headers
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return json({ error: msg }, headers, 500);
      }
    }

    // GET /api/user/sync-status?userId=xxx - Stato sincronizzazione
    if (path === "/api/user/sync-status" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return json({ error: "Missing userId parameter" }, headers, 400);
      }

      const status = await getUserSyncStatus(env.SORARE_AI_DATA, userId);
      if (!status) {
        return json({ error: "No JWT found for user" }, headers, 404);
      }

      return json({ userId, ...status }, headers);
    }

    // POST /api/user/refresh-cards - Forza aggiornamento carte (user chiama con JWT)
    if (path === "/api/user/refresh-cards" && request.method === "POST") {
      console.log(">>> /api/user/refresh-cards called");

      const bodyText = await request.text().catch(() => "{}");
      console.log(">>> Raw body:", bodyText.substring(0, 500));
      console.log(">>> Content-Type:", request.headers.get("content-type"));

      let body: { userId?: string; token?: string };
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        console.error(">>> JSON parse error:", e);
        return json(
          { error: "Invalid JSON body", raw: bodyText.substring(0, 200) },
          headers,
          400
        );
      }

      if (!(body.userId && body.token)) {
        return json({ error: "Required: userId, token" }, headers, 400);
      }

      // Salva JWT prima di sync (necessario per aggiornare lastSyncAt)
      await saveUserJWT(env.SORARE_AI_DATA, body.userId, body.token);

      // Esegui sync immediato
      const { syncSingleUserCards } = await import(
        "./handlers/sync-user-cards.js"
      );
      const result = await syncSingleUserCards(
        env.SORARE_AI_DATA,
        body.userId,
        body.token
      );

      return json(
        {
          success: result.success,
          userId: body.userId,
          cardsFound: result.cardsFound,
          cardsSaved: result.cardsSaved,
          error: result.error,
        },
        headers,
        result.success ? 200 : 500
      );
    }

    // POST /api/user/cleanup - Cancella tutte le carte di un utente (TEMP)
    if (path === "/api/user/cleanup" && request.method === "POST") {
      const body = (await request
        .json<{ userId?: string }>()
        .catch(() => ({}))) as {
        userId?: string;
      };

      if (!body.userId) {
        return json({ error: "Required: userId" }, headers, 400);
      }

      const prefix = `USR_${body.userId}:`;
      let deleted = 0;
      let cursor: string | undefined;

      do {
        const listResult = await env.SORARE_AI_DATA.list({
          prefix,
          cursor,
          limit: 1000,
        });
        for (const key of listResult.keys) {
          await env.SORARE_AI_DATA.delete(key.name);
          deleted++;
        }
        cursor = listResult.list_complete ? undefined : listResult.cursor;
      } while (cursor);

      return json({ success: true, userId: body.userId, deleted }, headers);
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
            "sync-user-cards",
            "analyze-homeaway",
            "analyze-aa",
            "analyze-odds",
            "cleanup-expired-odds",
          ].includes(job)
        )
      ) {
        return json(
          {
            error:
              "Unknown job. Use: extract-players, sync-extra-players, sync-user-cards, analyze-homeaway, analyze-aa, analyze-odds, cleanup-expired-odds",
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
        case "sync-user-cards":
          result = await syncUserCardsHandler(env.SORARE_AI_DATA, client);
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
        case "cleanup-expired-odds":
          result = await cleanupExpiredOddsHandler(repository);
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

      // Limite batch per sicurezza (allineato a lib/kv-api)
      if (body.cards.length > KV_CARDS_BATCH_SIZE) {
        return json(
          {
            error: `Batch too large. Max ${KV_CARDS_BATCH_SIZE} cards per request.`,
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

    // ============================================
    // FORMATIONS API
    // ============================================

    // GET /api/formations?userId=xxx - Lista tutte le formazioni dell'utente
    if (path === "/api/formations" && request.method === "GET") {
      const userId = url.searchParams.get("userId");

      if (!userId) {
        return json(
          { error: "Missing required parameter: userId" },
          headers,
          400
        );
      }

      const result = await listFormations(env.SORARE_AI_DATA, userId);

      if (!result.success) {
        return json({ error: result.error }, headers, 500);
      }

      return json(
        {
          userId,
          count: result.formations.length,
          formations: result.formations,
        },
        headers
      );
    }

    // POST /api/formations - Crea nuova formazione
    if (path === "/api/formations" && request.method === "POST") {
      const body = await request.json<SaveFormationRequest>().catch(() => null);

      if (!(body && body.userId && body.data)) {
        return json(
          { error: "Invalid request. Required: userId, data" },
          headers,
          400
        );
      }

      const result = await createFormation(
        env.SORARE_AI_DATA,
        body.userId,
        body.data
      );

      if (!result.success) {
        return json({ error: result.error }, headers, 500);
      }

      return json({ success: true, formation: result.formation }, headers, 201);
    }

    // PUT /api/formations/:id - Aggiorna formazione esistente
    if (path.startsWith("/api/formations/") && request.method === "PUT") {
      const formationId = path.replace("/api/formations/", "");

      if (!formationId) {
        return json({ error: "Missing formation ID in URL" }, headers, 400);
      }

      const body = await request.json<SaveFormationRequest>().catch(() => null);

      if (!(body && body.userId && body.data)) {
        return json(
          { error: "Invalid request. Required: userId, data" },
          headers,
          400
        );
      }

      const result = await updateFormation(
        env.SORARE_AI_DATA,
        body.userId,
        formationId,
        body.data
      );

      if (!result.success) {
        return json(
          { error: result.error },
          headers,
          result.notFound ? 404 : 500
        );
      }

      return json({ success: true, formation: result.formation }, headers);
    }

    // DELETE /api/formations/:id - Elimina formazione
    if (path.startsWith("/api/formations/") && request.method === "DELETE") {
      const formationId = path.replace("/api/formations/", "");

      if (!formationId) {
        return json({ error: "Missing formation ID in URL" }, headers, 400);
      }

      const userId = url.searchParams.get("userId");

      if (!userId) {
        return json(
          { error: "Missing required query parameter: userId" },
          headers,
          400
        );
      }

      const result = await deleteFormation(
        env.SORARE_AI_DATA,
        userId,
        formationId
      );

      if (!result.success) {
        return json(
          { error: result.error },
          headers,
          result.notFound ? 404 : 500
        );
      }

      return json({ success: true, message: "Formation deleted" }, headers);
    }

    // POST /api/admin/rebuild-extra-queue - Ricostruisce la coda extra da tutte le carte
    if (
      path === "/api/admin/rebuild-extra-queue" &&
      request.method === "POST"
    ) {
      const dryRun = url.searchParams.get("dryRun") !== "false";
      const userId = url.searchParams.get("userId") || undefined;

      const result = await rebuildExtraPlayersQueue(env.SORARE_AI_DATA, {
        dryRun,
        userId,
      });

      return json(
        {
          success: true,
          dryRun,
          userId: userId || "all",
          result,
          timestamp: new Date().toISOString(),
        },
        headers
      );
    }

    return json({ error: "Not found" }, headers, 404);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Handler error:", msg);
    return json({ error: msg }, headers, 500);
  }
}

/**
 * Ricostruisce la coda dei giocatori extra scansionando tutte le carte utente
 * Utile per migrare carte esistenti quando si aggiunge la funzionalità extra players
 */
async function rebuildExtraPlayersQueue(
  kv: KVNamespace,
  options: { dryRun: boolean; userId?: string }
): Promise<{
  scannedCards: number;
  uniquePlayers: number;
  existingPlayers: number;
  addedToQueue: number;
  errors: number;
  samplePlayers: string[];
}> {
  const { dryRun, userId } = options;

  const result = {
    scannedCards: 0,
    uniquePlayers: 0,
    existingPlayers: 0,
    addedToQueue: 0,
    errors: 0,
    samplePlayers: [] as string[],
  };

  try {
    // Importa le funzioni necessarie
    const { createKVRepository } = await import("./lib/kv-repository.js");
    const { extractCorrectPlayerSlug } = await import(
      "./handlers/user-cards.js"
    );

    const repository = createKVRepository(kv);
    const uniqueSlugs = new Set<string>();

    // Scansiona le carte (tutti gli utenti o solo uno specifico)
    const prefix = userId ? `USR_${userId}:` : "USR_";
    let cursor: string | undefined;
    let totalCards = 0;

    do {
      const listResult = await kv.list({
        prefix,
        limit: 1000,
        cursor,
      });

      for (const key of listResult.keys) {
        totalCards++;
        const value = await kv.get(key.name);
        if (!value) continue;

        try {
          const cardData = JSON.parse(value) as Record<string, unknown>;
          const cardSlug = cardData.slug as string;
          const playerSlug = cardData.playerSlug as string;

          if (!(cardSlug && playerSlug)) continue;

          // Estrai lo slug corretto (gestisce date di nascita)
          const correctSlug = extractCorrectPlayerSlug(cardSlug, playerSlug);

          if (!uniqueSlugs.has(correctSlug)) {
            uniqueSlugs.add(correctSlug);

            // Verifica se il player esiste già
            const existing = await repository.findBySlug(correctSlug);

            if (existing) {
              result.existingPlayers++;
            } else {
              // Non esiste nel database
              result.addedToQueue++;

              // Salva i primi 10 esempi
              if (result.samplePlayers.length < 10) {
                result.samplePlayers.push(correctSlug);
              }
            }
          }
        } catch (e) {
          result.errors++;
        }
      }

      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    result.scannedCards = totalCards;
    result.uniquePlayers = uniqueSlugs.size;

    // Se non dryRun, salva TUTTI gli slugs in una volta sola
    if (!dryRun && result.addedToQueue > 0) {
      const slugsToAdd = Array.from(uniqueSlugs).filter(async (slug) => {
        const existing = await repository.findBySlug(slug);
        return !existing;
      });

      // Salva la lista nel KV
      await kv.put("SYSTEM:EXTRA_PLAYER_SLUGS", JSON.stringify(slugsToAdd));
      console.log(`[RebuildQueue] Saved ${slugsToAdd.length} players to queue`);
    }

    console.log(
      `[RebuildQueue] Scanned ${result.scannedCards} cards, found ${result.uniquePlayers} unique players`
    );
    console.log(
      `[RebuildQueue] Existing: ${result.existingPlayers}, Added to queue: ${result.addedToQueue}, Errors: ${result.errors}`
    );

    return result;
  } catch (error) {
    console.error("[RebuildQueue] Error:", error);
    throw error;
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
  url.searchParams.sort();
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
 * Invalida le varianti piu' comuni di /api/cards/with-players
 * sia su workers.dev che sul dominio custom.
 */
export async function invalidateUserCache(
  kv: KVNamespace,
  userId: string
): Promise<string[]> {
  const cache = (caches as unknown as { default: Cache }).default;
  const invalidatedUrls: string[] = [];
  const hosts = [
    "https://sorare-mls-sync.loziobiz.workers.dev",
    "https://mls-sync.alebisi.it",
  ];
  const clubCodes = await getUserClubCodesForCacheInvalidation(kv, userId);

  for (const host of hosts) {
    const urlsToInvalidate = [
      buildWithPlayersUrl(host, { userId }),
      buildWithPlayersUrl(host, { userId, limit: "1000" }),
    ];

    for (const clubCode of clubCodes) {
      urlsToInvalidate.push(buildWithPlayersUrl(host, { userId, clubCode }));
      urlsToInvalidate.push(
        buildWithPlayersUrl(host, { userId, clubCode, limit: "1000" })
      );
    }

    for (const urlString of urlsToInvalidate) {
      try {
        const cacheKey = createCacheKey(
          new Request(urlString, { method: "GET" })
        );
        const deleted = await cache.delete(cacheKey);
        console.log(`[CACHE INVALIDATE] ${urlString} - Success: ${deleted}`);
        invalidatedUrls.push(urlString);
      } catch (error) {
        console.error(`[CACHE INVALIDATE ERROR] ${urlString}:`, error);
      }
    }
  }

  return invalidatedUrls;
}

function buildWithPlayersUrl(
  host: string,
  params: {
    userId: string;
    clubCode?: string;
    limit?: string;
  }
): string {
  const url = new URL("/api/cards/with-players", host);
  url.searchParams.set("userId", params.userId);
  if (params.clubCode) {
    url.searchParams.set("clubCode", params.clubCode);
  }
  if (params.limit) {
    url.searchParams.set("limit", params.limit);
  }
  url.searchParams.sort();
  return url.toString();
}

async function getUserClubCodesForCacheInvalidation(
  kv: KVNamespace,
  userId: string
): Promise<string[]> {
  const clubCodes = new Set<string>();
  const prefix = `USR_${userId}:`;
  let cursor: string | undefined;

  do {
    const listResult = await kv.list({
      prefix,
      cursor,
      limit: 1000,
    });

    for (const key of listResult.keys) {
      const parsed = parseUserCardKey(key.name);
      if (parsed?.clubCode) {
        clubCodes.add(parsed.clubCode);
      }
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor;
  } while (cursor);

  return Array.from(clubCodes).sort();
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
