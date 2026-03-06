#!/usr/bin/env tsx
/**
 * Analyze MLS Players - All-Around (AA) Scores
 *
 * Calculates AA5, AA15, AA25 averages and saves to mls-players.json
 * in the stats.aaAnalysis section.
 *
 * Usage:
 *   pnpm analyze-mls-aa
 *   pnpm analyze-mls-aa Forward           # Filter by position
 *   pnpm analyze-mls-aa --limit=10        # Limit players
 *   pnpm analyze-mls-aa --dry-run         # Preview without saving
 */

import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { getEnv } from "../lib/env.js";
import {
  createPlayerRepository,
  type PlayerRecord,
  type PlayerStats,
} from "../lib/repository.js";
import { SorareClient } from "../lib/sorare-client.js";

config({ path: ".env.local" });
config({ path: ".env" });

const STATE_FILE = "./data/.analyze-mls-aa-state.json";

interface AAAnalysis {
  calculatedAt: string;
  gamesAnalyzed: number;
  AA5: number | null;
  AA15: number | null;
  AA25: number | null;
  validScores: number[];
}

interface AnalysisResult {
  slug: string;
  displayName: string;
  clubName?: string;
  position?: string;
  calculatedAt: string;
  aaAnalysis: AAAnalysis;
  error?: string;
}

interface State {
  completed: string[];
  failed: string[];
  totalPlayers: number;
}

interface GameScore {
  allAroundScore: number;
  scoreStatus: string;
}

const GET_PLAYER_GAME_SCORES = `
  query GetPlayerGameScores($slug: String!, $last: Int!) {
    football {
      player(slug: $slug) {
        ... on Player {
          allPlayerGameScores(first: $last) {
            edges {
              node {
                ... on PlayerGameScore {
                  allAroundScore
                  scoreStatus
                }
              }
            }
          }
        }
      }
    }
  }
`;

function parseArgs(): {
  positionFilter?: string;
  limit?: number;
  delay: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);

  let positionFilter: string | undefined;
  let limit: number | undefined;
  let delay = 1000;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--delay=")) {
      delay = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!arg.startsWith("--")) {
      positionFilter = arg;
    }
  }

  return { positionFilter, limit, delay, dryRun };
}

function loadState(): State {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as State;
    } catch {
      console.log("⚠️  Failed to load state, starting fresh");
    }
  }
  return { completed: [], failed: [], totalPlayers: 0 };
}

function saveState(state: State): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function analyzePlayerAA(
  client: SorareClient,
  slug: string,
  playerInfo: { displayName: string; clubName?: string; position?: string }
): Promise<AnalysisResult> {
  try {
    const response = await client.query<{
      football: {
        player: {
          allPlayerGameScores: {
            edges: Array<{ node: GameScore }>;
          };
        };
      };
    }>(GET_PLAYER_GAME_SCORES, { slug, last: 25 });

    const scores = response.football.player.allPlayerGameScores.edges.map(
      (edge) => edge.node
    );

    // Filter valid AA scores (!= 0, excluding DID_NOT_PLAY)
    const validAAScores = scores
      .filter(
        (score) =>
          score.allAroundScore !== 0 && score.scoreStatus !== "DID_NOT_PLAY"
      )
      .map((score) => score.allAroundScore);

    // Calculate averages for different spans
    const AA5 =
      validAAScores.length >= 5
        ? Number(
            (validAAScores.slice(0, 5).reduce((a, b) => a + b, 0) / 5).toFixed(
              2
            )
          )
        : null;

    const AA15 =
      validAAScores.length >= 15
        ? Number(
            (
              validAAScores.slice(0, 15).reduce((a, b) => a + b, 0) / 15
            ).toFixed(2)
          )
        : null;

    const AA25 =
      validAAScores.length >= 25
        ? Number(
            (
              validAAScores.reduce((a, b) => a + b, 0) / validAAScores.length
            ).toFixed(2)
          )
        : null;

    const aaAnalysis: AAAnalysis = {
      calculatedAt: new Date().toISOString(),
      gamesAnalyzed: scores.length,
      AA5,
      AA15,
      AA25,
      validScores: validAAScores,
    };

    return {
      slug,
      displayName: playerInfo.displayName,
      clubName: playerInfo.clubName,
      position: playerInfo.position,
      calculatedAt: new Date().toISOString(),
      aaAnalysis,
      error:
        validAAScores.length === 0 ? "No valid AA scores found" : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      slug,
      displayName: playerInfo.displayName,
      clubName: playerInfo.clubName,
      position: playerInfo.position,
      calculatedAt: new Date().toISOString(),
      aaAnalysis: {
        calculatedAt: new Date().toISOString(),
        gamesAnalyzed: 0,
        AA5: null,
        AA15: null,
        AA25: null,
        validScores: [],
      },
      error: message,
    };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { positionFilter, limit, delay, dryRun } = parseArgs();

  console.log("🚀 Starting MLS AA Analysis (AA5 / AA15 / AA25)");
  console.log("=".repeat(50));

  // Check for token
  const token = getEnv("SORARE_JWT_TOKEN");
  if (!token) {
    console.error("❌ No JWT token found. Run: pnpm import-token");
    process.exit(1);
  }

  // Load database
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

  console.log(`📊 Found ${db.players.length} MLS players in database`);

  // Filter players
  let playersToAnalyze = db.players;
  if (positionFilter) {
    const filter = positionFilter.toUpperCase();
    playersToAnalyze = playersToAnalyze.filter(
      (p) => p.position?.toUpperCase() === filter
    );
    console.log(`🔍 Filtered to ${playersToAnalyze.length} ${positionFilter}s`);
  }
  if (limit) {
    playersToAnalyze = playersToAnalyze.slice(0, limit);
    console.log(`🔍 Limited to ${playersToAnalyze.length} players`);
  }

  // Load state
  const state = loadState();
  state.totalPlayers = playersToAnalyze.length;

  // Filter out already analyzed (check if aaAnalysis exists in stats)
  const remaining = playersToAnalyze.filter(
    (p) => !(state.completed.includes(p.slug) || state.failed.includes(p.slug))
  );

  console.log(`✅ ${state.completed.length} already analyzed`);
  console.log(`❌ ${state.failed.length} previously failed`);
  console.log(`⏳ ${remaining.length} remaining to analyze`);
  if (dryRun) {
    console.log("🏃 Dry run mode - no changes will be saved");
  }
  console.log();

  const client = new SorareClient();
  const updates: Array<{ slug: string; data: Partial<PlayerRecord> }> = [];
  let processed = 0;
  let errors = 0;

  for (const player of remaining) {
    processed++;
    console.log(
      `[${processed}/${remaining.length}] Analyzing ${player.name} (${player.position || "Unknown"})...`
    );

    const result = await analyzePlayerAA(client, player.slug, {
      displayName: player.name,
      clubName: player.clubName,
      position: player.position,
    });

    if (result.error && !result.aaAnalysis.AA5) {
      console.log(`   ❌ ${result.error}`);
      state.failed.push(player.slug);
      errors++;
    } else {
      const aaDisplay = [
        result.aaAnalysis.AA5 !== null
          ? `AA5:${result.aaAnalysis.AA5}`
          : "AA5:-",
        result.aaAnalysis.AA15 !== null
          ? `AA15:${result.aaAnalysis.AA15}`
          : "AA15:-",
        result.aaAnalysis.AA25 !== null
          ? `AA25:${result.aaAnalysis.AA25}`
          : "AA25:-",
      ].join(" | ");
      console.log(`   ✅ ${aaDisplay}`);
      state.completed.push(player.slug);

      if (!dryRun) {
        // Prepare update for repository
        const stats: PlayerStats = {
          ...player.stats,
          aaAnalysis: result.aaAnalysis,
        };

        updates.push({
          slug: player.slug,
          data: { stats },
        });
      }
    }

    // Save progress every 10 players
    if (!dryRun && updates.length > 0 && updates.length % 10 === 0) {
      console.log(`     💾 Saving batch of ${updates.length} players...`);
      await repository.updateMany(updates);
      updates.length = 0;
    }

    // Save state every player
    saveState(state);

    // Rate limiting
    if (processed < remaining.length) {
      await sleep(delay);
    }
  }

  // Final save
  if (!dryRun && updates.length > 0) {
    console.log(`\n💾 Saving final batch of ${updates.length} players...`);
    await repository.updateMany(updates);
  } else if (dryRun && updates.length > 0) {
    console.log(`\n🏃 Dry run - would save ${updates.length} players`);
  }

  // Summary
  console.log();
  console.log("=".repeat(50));
  console.log("📊 Analysis Complete!");
  console.log(`   Total analyzed: ${state.completed.length}`);
  console.log(`   Failed: ${state.failed.length}`);

  // Show top 10 by AA5 from database
  const updatedDb = dryRun ? db : await repository.load();
  const withAA = updatedDb.players.filter(
    (p) =>
      p.stats?.aaAnalysis?.AA5 !== null &&
      p.stats?.aaAnalysis?.AA5 !== undefined
  );
  const sortedByAA5 = withAA
    .sort(
      (a, b) =>
        (b.stats!.aaAnalysis!.AA5 || 0) - (a.stats!.aaAnalysis!.AA5 || 0)
    )
    .slice(0, 10);

  console.log();
  console.log("🏆 Top 10 Players by AA5:");
  sortedByAA5.forEach((p, i) => {
    console.log(
      `   ${i + 1}. ${p.name} (${p.position}) - AA5: ${p.stats!.aaAnalysis!.AA5}`
    );
  });

  // Stats by position
  console.log();
  console.log("📈 Average AA5 by Position:");
  const byPosition = new Map<string, number[]>();
  for (const p of withAA) {
    const pos = p.position || "Unknown";
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)?.push(p.stats!.aaAnalysis!.AA5 || 0);
  }
  for (const [pos, values] of byPosition) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    console.log(`   ${pos}: ${avg.toFixed(2)} (${values.length} players)`);
  }
}

main().catch(console.error);
