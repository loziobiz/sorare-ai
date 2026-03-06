/**
 * Cloudflare Worker API for Player Analytics (KV version)
 *
 * Exposes KV data to the dashboard via HTTP endpoints.
 * Deploy: wrangler deploy
 */

import { createKvClient, type PlayerStatsData } from "../lib/kv-client.js";

export interface Env {
  PLAYER_STATS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const kv = createKvClient(env.PLAYER_STATS);

    // CORS headers
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      // GET /api/players - List all players
      if (path === "/api/players" && request.method === "GET") {
        const players = await kv.listPlayers();
        return json({ players, count: players.length }, headers);
      }

      // GET /api/players/:slug - Get single player
      const playerMatch = path.match(/^\/api\/players\/([^/]+)$/);
      if (playerMatch && request.method === "GET") {
        const slug = playerMatch[1];
        const player = await kv.getPlayer(slug);

        if (!player) {
          return json({ error: "Player not found" }, headers, 404);
        }

        return json(player, headers);
      }

      // PUT /api/players/:slug - Save player (for bulk import)
      if (playerMatch && request.method === "PUT") {
        const slug = playerMatch[1];
        const body = await request.json<PlayerStatsData>();

        if (body.slug !== slug) {
          return json({ error: "Slug mismatch" }, headers, 400);
        }

        await kv.savePlayer(body);
        return json({ success: true, slug }, headers);
      }

      // DELETE /api/players/:slug - Delete player
      if (playerMatch && request.method === "DELETE") {
        const slug = playerMatch[1];
        await kv.deletePlayer(slug);
        return json({ success: true, slug }, headers);
      }

      // GET /api/search - Search by metadata
      if (path === "/api/search" && request.method === "GET") {
        const params = url.searchParams;
        const minAdvantage = Number.parseFloat(
          params.get("min_advantage") || "-999"
        );
        const maxAdvantage = Number.parseFloat(
          params.get("max_advantage") || "999"
        );
        const club = params.get("club");

        const allKeys = await kv.listPlayers();
        const players: PlayerStatsData[] = [];

        for (const key of allKeys) {
          const data = await kv.getPlayer(key.slug);
          if (!data) continue;

          // Filter by home advantage
          if (
            data.homeAdvantageFactor < minAdvantage ||
            data.homeAdvantageFactor > maxAdvantage
          ) {
            continue;
          }

          // Filter by club
          if (club && data.clubName !== club) {
            continue;
          }

          players.push(data);
        }

        // Sort by home advantage desc
        players.sort((a, b) => b.homeAdvantageFactor - a.homeAdvantageFactor);

        return json({ players, count: players.length }, headers);
      }

      // GET /api/clubs - List all clubs
      if (path === "/api/clubs" && request.method === "GET") {
        const allKeys = await kv.listPlayers();
        const clubCounts = new Map<string, number>();

        for (const key of allKeys) {
          const club = key.metadata?.clubName;
          if (club) {
            clubCounts.set(club, (clubCounts.get(club) || 0) + 1);
          }
        }

        const clubs = Array.from(clubCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        return json({ clubs }, headers);
      }

      return json({ error: "Not found" }, headers, 404);
    } catch (error) {
      console.error("API Error:", error);
      return json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        headers,
        500
      );
    }
  },
};

function json(data: unknown, headers: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
