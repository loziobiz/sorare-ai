/**
 * Cloudflare KV Client for Player Analytics
 *
 * Simple key-value storage: slug → JSON data
 * Works in both CLI (via wrangler kv command) and Worker environments.
 */

export interface PlayerStatsData {
  slug: string;
  displayName: string;
  clubName?: string;
  calculatedAt: string;
  gamesAnalyzed: number;
  home: {
    games: number;
    average: number;
    scores: number[];
  };
  away: {
    games: number;
    average: number;
    scores: number[];
  };
  homeAdvantageFactor: number;
  tags?: string[];
}

export class KVClient {
  private kv: KVNamespace | null = null;

  constructor(kv?: KVNamespace) {
    if (kv) {
      this.kv = kv;
    }
  }

  // Check if running in Worker environment
  private isWorker(): boolean {
    return this.kv !== null;
  }

  // Save player stats
  async savePlayer(stats: PlayerStatsData): Promise<void> {
    if (!this.isWorker()) {
      // CLI mode: output wrangler command
      console.log("\n💾 To save to KV, run:");
      console.log(
        `echo '${JSON.stringify(stats).replace(/'/g, "'\\''")}' | wrangler kv key put --binding=PLAYER_STATS "${stats.slug}"`
      );
      return;
    }

    await this.kv!.put(stats.slug, JSON.stringify(stats), {
      metadata: {
        displayName: stats.displayName,
        clubName: stats.clubName,
        calculatedAt: stats.calculatedAt,
        homeAdvantageFactor: stats.homeAdvantageFactor,
      },
    });
  }

  // Get player stats
  async getPlayer(slug: string): Promise<PlayerStatsData | null> {
    if (!this.isWorker()) {
      throw new Error(
        "Direct KV read not available in CLI mode. Use: wrangler kv key get --binding=PLAYER_STATS"
      );
    }

    const data = await this.kv!.get(slug);
    return data ? (JSON.parse(data) as PlayerStatsData) : null;
  }

  // List all keys (with optional prefix)
  async listPlayers(
    prefix?: string
  ): Promise<{ slug: string; metadata?: Record<string, unknown> }[]> {
    if (!this.isWorker()) {
      throw new Error(
        "KV list not available in CLI mode. Use: wrangler kv list --binding=PLAYER_STATS"
      );
    }

    const list = await this.kv!.list({ prefix });
    return list.keys.map((k) => ({
      slug: k.name,
      metadata: k.metadata as Record<string, unknown>,
    }));
  }

  // Delete player
  async deletePlayer(slug: string): Promise<void> {
    if (!this.isWorker()) {
      console.log(`wrangler kv key delete --binding=PLAYER_STATS "${slug}"`);
      return;
    }
    await this.kv!.delete(slug);
  }

  // Get multiple players by slugs
  async getPlayers(slugs: string[]): Promise<PlayerStatsData[]> {
    const results: PlayerStatsData[] = [];
    for (const slug of slugs) {
      const data = await this.getPlayer(slug);
      if (data) results.push(data);
    }
    return results;
  }
}

// Factory function
export function createKvClient(kv?: KVNamespace): KVClient {
  return new KVClient(kv);
}
