#!/usr/bin/env tsx
/**
 * Analyze All MLS Players
 *
 * Fetches historical SO5 scores for all MLS players with rate limiting.
 * Updates mls-players.json usando il repository pattern.
 *
 * Usage:
 *   pnpm analyze-mls
 *   pnpm analyze-mls --delay=2000      # 2 second delay between requests
 *   pnpm analyze-mls --limit=50        # Analyze only first 50 players
 *   pnpm analyze-mls --position=Forward # Analyze only forwards
 *   pnpm analyze-mls --resume          # Resume from last saved state
 *   pnpm analyze-mls --dry-run         # Show what would be updated without saving
 */

import { config } from "dotenv";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { GET_PLAYER_GAME_SCORES, GET_PLAYER_INFO } from "../lib/queries.js";
import {
  createHomeAwayStats,
  createPlayerRepository,
  type PlayerRecord,
  type PlayerStats,
} from "../lib/repository.js";
import { SorareClient } from "../lib/sorare-client.js";
import type { Player, PlayerData } from "../lib/types.js";

config({ path: ".env.local" });
config({ path: ".env" });

const STATE_FILE = "./data/.analyze-mls-state.json";

interface AnalysisState {
  lastIndex: number;
  completedSlugs: string[];
  failedSlugs: string[];
}

interface PlayerAnalysis {
  slug: string;
  displayName: string;
  clubName?: string;
  position?: string;
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
  error?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);

  let delay = 1000; // Default 1 second between requests
  let limit: number | null = null;
  let position: string | null = null;
  let resume = false;
  let gamesCount = 50;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--delay=")) {
      delay = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--limit=")) {
      limit = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--position=")) {
      position = arg.split("=")[1];
    } else if (arg.startsWith("--games=")) {
      gamesCount = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg === "--resume") {
      resume = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { delay, limit, position, resume, gamesCount, dryRun };
}

function loadState(): AnalysisState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return { lastIndex: 0, completedSlugs: [], failedSlugs: [] };
}

function saveState(state: AnalysisState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function analyzePlayer(
  client: SorareClient,
  slug: string,
  gamesCount: number
): Promise<PlayerAnalysis | null> {
  try {
    // Fetch player info
    const infoData = await client.query<{ players: Player[] }>(
      GET_PLAYER_INFO,
      {
        slug,
      }
    );

    if (!infoData.players || infoData.players.length === 0) {
      return null;
    }

    const playerInfo = infoData.players[0];

    // Fetch game scores
    const scoresData = await client.query<PlayerData>(GET_PLAYER_GAME_SCORES, {
      slug,
      last: gamesCount,
    });

    if (!scoresData.football?.player) {
      return null;
    }

    const player = scoresData.football.player;
    const scores = player.allPlayerGameScores?.edges?.map((e) => e.node) || [];
    const clubName = player.activeClub?.name;

    const homeScores: number[] = [];
    const awayScores: number[] = [];

    for (const score of scores) {
      if (!score?.anyGame) continue;

      // Skip null/0 scores (player didn't play or no valid score)
      if (score.score <= 0) continue;

      const isHome = score.anyGame.homeTeam?.name === clubName;
      const isAway = score.anyGame.awayTeam?.name === clubName;

      if (isHome) {
        homeScores.push(score.score);
      } else if (isAway) {
        awayScores.push(score.score);
      }
    }

    const homeAverage =
      homeScores.length > 0
        ? homeScores.reduce((a, b) => a + b, 0) / homeScores.length
        : 0;

    const awayAverage =
      awayScores.length > 0
        ? awayScores.reduce((a, b) => a + b, 0) / awayScores.length
        : 0;

    const homeAdvantageFactor =
      awayAverage > 0 ? (homeAverage - awayAverage) / awayAverage : 0;

    return {
      slug: player.slug,
      displayName: player.displayName,
      clubName: player.activeClub?.name,
      calculatedAt: new Date().toISOString(),
      gamesAnalyzed: scores.length,
      home: {
        games: homeScores.length,
        average: Number(homeAverage.toFixed(2)),
        scores: homeScores,
      },
      away: {
        games: awayScores.length,
        average: Number(awayAverage.toFixed(2)),
        scores: awayScores,
      },
      homeAdvantageFactor: Number(homeAdvantageFactor.toFixed(4)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      slug,
      displayName: "",
      calculatedAt: new Date().toISOString(),
      gamesAnalyzed: 0,
      home: { games: 0, average: 0, scores: [] },
      away: { games: 0, average: 0, scores: [] },
      homeAdvantageFactor: 0,
      error: message,
    };
  }
}

async function main() {
  const { delay, limit, position, resume, gamesCount, dryRun } = parseArgs();

  const repository = createPlayerRepository();
  let db;

  try {
    db = await repository.load();
  } catch (error) {
    console.error(
      "❌ Failed to load MLS database. Run: pnpm extract-mls-players"
    );
    process.exit(1);
  }

  let players = db.players;

  // Filter by position if specified
  if (position) {
    players = players.filter((p) => p.position === position);
    console.log(`🔍 Filtered to ${players.length} ${position}s`);
  }

  // Apply limit
  if (limit) {
    players = players.slice(0, limit);
    console.log(`🔍 Limited to first ${players.length} players`);
  }

  const state = resume
    ? loadState()
    : { lastIndex: 0, completedSlugs: [], failedSlugs: [] };

  // Track which players have already been analyzed (based on existing stats)
  const analyzedSlugs = new Set(
    players
      .filter((p) => p.stats?.homeAwayAnalysis !== undefined)
      .map((p) => p.slug)
  );

  console.log(`📊 Analyzing ${players.length} MLS players`);
  console.log(`⏱️  Delay between requests: ${delay}ms`);
  console.log(`🎮 Games per player: ${gamesCount}`);
  console.log("💾 Results will be saved to: mls-players.json");
  if (dryRun) {
    console.log("🏃 Dry run mode - no changes will be saved");
  }
  if (resume) {
    console.log(`🔄 Resuming from index ${state.lastIndex}`);
  }
  console.log("");

  const client = new SorareClient();
  const startIndex = resume ? state.lastIndex : 0;

  // Colleziona tutti gli aggiornamenti da fare
  const updates: Array<{ slug: string; data: Partial<PlayerRecord> }> = [];
  const analyses: PlayerAnalysis[] = [];

  for (let i = startIndex; i < players.length; i++) {
    const player = players[i];

    // Skip if already analyzed and not in resume mode with explicit flag
    if (analyzedSlugs.has(player.slug) && !resume) {
      console.log(
        `[${i + 1}/${players.length}] ⏭️  ${player.name} - already analyzed`
      );
      state.lastIndex = i + 1;
      saveState(state);
      continue;
    }

    console.log(
      `[${i + 1}/${players.length}] 🔍 Analyzing ${player.name} (${player.position || "Unknown"})...`
    );

    const result = await analyzePlayer(client, player.slug, gamesCount);

    if (result) {
      // Add position from MLS data if not already present
      if (!result.position) {
        result.position = player.position;
      }

      if (result.error) {
        console.log(`     ❌ Error: ${result.error}`);
        state.failedSlugs.push(player.slug);
      } else {
        console.log(
          `     ✅ Home: ${result.home.average.toFixed(1)} (${result.home.games} games) | Away: ${result.away.average.toFixed(1)} (${result.away.games} games) | HA: ${(result.homeAdvantageFactor * 100).toFixed(1)}%`
        );

        // Prepara l'aggiornamento per il repository
        const stats: PlayerStats = {
          homeAwayAnalysis: createHomeAwayStats({
            calculatedAt: result.calculatedAt,
            gamesAnalyzed: result.gamesAnalyzed,
            home: result.home,
            away: result.away,
            homeAdvantageFactor: result.homeAdvantageFactor,
          }),
        };

        updates.push({
          slug: player.slug,
          data: { stats },
        });

        analyses.push(result);
        state.completedSlugs.push(player.slug);
      }
    }

    state.lastIndex = i + 1;
    saveState(state);

    // Save progress every 10 players (se non è dry-run)
    if (!dryRun && updates.length > 0 && updates.length % 10 === 0) {
      console.log(
        `     💾 Saving batch of ${updates.length} players to repository...`
      );
      await repository.updateMany(updates);
      updates.length = 0; // Clear the array
    }

    // Delay before next request (except for last one)
    if (i < players.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Save remaining updates
  if (!dryRun && updates.length > 0) {
    console.log(
      `\n💾 Saving final batch of ${updates.length} players to repository...`
    );
    await repository.updateMany(updates);
  } else if (dryRun && updates.length > 0) {
    console.log(`\n🏃 Dry run - would save ${updates.length} players:`);
    updates.forEach((u) => console.log(`   - ${u.slug}`));
  }

  // Print summary
  const successful = analyses.filter((r) => !r.error);
  const byPosition = successful.reduce(
    (acc, r) => {
      const pos = r.position || "Unknown";
      if (!acc[pos]) acc[pos] = { count: 0, avgHA: 0 };
      acc[pos].count++;
      acc[pos].avgHA += r.homeAdvantageFactor;
      return acc;
    },
    {} as Record<string, { count: number; avgHA: number }>
  );

  console.log("\n📊 Summary:");
  console.log(
    `  Total analyzed this run: ${successful.length}/${players.length - startIndex}`
  );
  console.log(`  Failed: ${state.failedSlugs.length}`);

  if (successful.length > 0) {
    console.log("\n  By Position:");
    for (const [pos, data] of Object.entries(byPosition)) {
      console.log(
        `    ${pos}: ${data.count} players, avg HA: ${((data.avgHA / data.count) * 100).toFixed(1)}%`
      );
    }
  }

  // Clean up state file if completed
  if (state.lastIndex >= players.length) {
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
    console.log("\n✅ All players analyzed!");
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
