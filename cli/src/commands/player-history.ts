#!/usr/bin/env tsx
/**
 * Player History CLI
 *
 * Fetches historical SO5 scores for a player and analyzes home/away performance.
 * Saves results to mls-players.json usando il repository pattern.
 *
 * Usage:
 *   pnpm player:history <player-slug> [number-of-games] [--save]
 *   pnpm player:history <player-slug> [number-of-games] [--dry-run]  # Non salva
 */

import { config } from "dotenv";
import { SorareClient } from "../lib/sorare-client.js";
import { GET_PLAYER_INFO, GET_PLAYER_GAME_SCORES } from "../lib/queries.js";
import type { Player, PlayerData } from "../lib/types.js";
import {
  createPlayerRepository,
  createHomeAwayStats,
  type HomeAwayStats,
  type PlayerStats,
} from "../lib/repository.js";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const USAGE = `
Usage: pnpm player:history <player-slug> [number-of-games] [--save] [--dry-run]

Arguments:
  player-slug      Player slug (e.g., kylian-mbappe, erling-haaland)
  number-of-games  Number of games to analyze (default: 50, max: 100)
  --save           Save results to mls-players.json
  --dry-run        Show results without saving

Examples:
  pnpm player:history kylian-mbappe
  pnpm player:history erling-haaland 60
  pnpm player:history kylian-mbappe --save
  pnpm player:history kylian-mbappe --dry-run
`;

interface AnalysisResult {
  player: Player;
  homeScores: number[];
  awayScores: number[];
  homeAverage: number;
  awayAverage: number;
  homeAdvantageFactor: number;
  totalGames: number;
}

function parseArgs(): { slug: string; last: number; save: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: Player slug is required");
    console.log(USAGE);
    process.exit(1);
  }

  const save = args.includes("--save");
  const dryRun = args.includes("--dry-run");
  const filteredArgs = args.filter((a) => a !== "--save" && a !== "--dry-run");

  const slug = filteredArgs[0];
  const last = Math.min(parseInt(filteredArgs[1] || "50", 10), 100);

  return { slug, last, save, dryRun };
}

function analyzeHomeAway(player: Player): AnalysisResult {
  const scores = player.allPlayerGameScores?.edges?.map((e) => e.node) || [];
  const clubName = player.activeClub?.name;

  if (!clubName) {
    console.warn(`Warning: No active club found for ${player.displayName}`);
  }

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
    player,
    homeScores,
    awayScores,
    homeAverage,
    awayAverage,
    homeAdvantageFactor,
    totalGames: scores.length,
  };
}

function formatOutput(analysis: AnalysisResult): void {
  const {
    player,
    homeScores,
    awayScores,
    homeAverage,
    awayAverage,
    homeAdvantageFactor,
    totalGames,
  } = analysis;

  console.log(`\n📊 Player Analysis: ${player.displayName}`);
  console.log(`   Club: ${player.activeClub?.name || "N/A"}`);
  console.log(`   Total Games Analyzed: ${totalGames}\n`);

  console.log("┌─────────────────────────────────────────┐");
  console.log("│         HOME vs AWAY PERFORMANCE        │");
  console.log("├─────────────────────────────────────────┤");
  console.log(`│  Home Games: ${homeScores.length.toString().padStart(3)}                    │`);
  console.log(`│  Home Avg:   ${homeAverage.toFixed(2).padStart(6)}                  │`);
  console.log(`│  Away Games: ${awayScores.length.toString().padStart(3)}                    │`);
  console.log(`│  Away Avg:   ${awayAverage.toFixed(2).padStart(6)}                  │`);
  console.log("├─────────────────────────────────────────┤");
  console.log(
    `│  Home Advantage: ${(homeAdvantageFactor * 100).toFixed(1).padStart(5)}%              │`
  );
  console.log(
    `│  (${
      homeAdvantageFactor > 0
        ? "performs better at home"
        : "performs better away"
    })${"".padStart(16)} │`
  );
  console.log("└─────────────────────────────────────────┘\n");
}

async function saveToRepository(
  analysis: AnalysisResult
): Promise<boolean> {
  const {
    player,
    homeScores,
    awayScores,
    homeAverage,
    awayAverage,
    homeAdvantageFactor,
    totalGames,
  } = analysis;

  const repository = createPlayerRepository();

  // Verifica se il giocatore esiste nel repository
  const existingPlayer = await repository.findBySlug(player.slug);
  
  if (!existingPlayer) {
    console.warn(`⚠️  Player ${player.slug} not found in MLS database. Skipping save.`);
    return false;
  }

  // Crea le statistiche nel formato corretto
  const homeAwayStats: HomeAwayStats = createHomeAwayStats({
    calculatedAt: new Date().toISOString(),
    gamesAnalyzed: totalGames,
    home: {
      games: homeScores.length,
      average: Number(homeAverage.toFixed(2)),
    },
    away: {
      games: awayScores.length,
      average: Number(awayAverage.toFixed(2)),
    },
    homeAdvantageFactor: Number(homeAdvantageFactor.toFixed(4)),
  });

  const stats: PlayerStats = {
    homeAwayAnalysis: homeAwayStats,
  };

  // Aggiorna il repository
  const updated = await repository.updatePlayerStats(player.slug, stats);
  
  if (updated) {
    console.log(`💾 Saved to mls-players.json`);
  } else {
    console.log(`⏭️  No changes to save (data unchanged or null values preserved)`);
  }
  
  return updated;
}

async function main() {
  const { slug, last, save, dryRun } = parseArgs();

  const client = new SorareClient();

  try {
    console.log(`Fetching ${last} games for ${slug}...`);

    // First, verify the player exists
    const infoData = await client.query<{ players: Player[] }>(GET_PLAYER_INFO, {
      slug,
    });

    if (!infoData.players || infoData.players.length === 0) {
      console.error(`Player not found: ${slug}`);
      process.exit(1);
    }

    // Then fetch game scores using deprecated but working "player" field
    const scoresData = await client.query<PlayerData>(GET_PLAYER_GAME_SCORES, {
      slug,
      last,
    });

    if (!scoresData.football?.player) {
      console.error(`Could not fetch game scores for: ${slug}`);
      process.exit(1);
    }

    const analysis = analyzeHomeAway(scoresData.football.player);
    formatOutput(analysis);

    if (save && !dryRun) {
      await saveToRepository(analysis);
    } else if (dryRun) {
      console.log(`\n🏃 Dry run mode - not saving to repository`);
      console.log(`   Would save data for: ${analysis.player.slug}`);
      console.log(`   Home avg: ${analysis.homeAverage.toFixed(2)} (${analysis.homeScores.length} games)`);
      console.log(`   Away avg: ${analysis.awayAverage.toFixed(2)} (${analysis.awayScores.length} games)`);
    }

    // Always output JSON to stderr if OUTPUT_JSON is set (for machine parsing)
    if (process.env.OUTPUT_JSON) {
      const outputData = {
        slug: analysis.player.slug,
        displayName: analysis.player.displayName,
        clubName: analysis.player.activeClub?.name,
        calculatedAt: new Date().toISOString(),
        gamesAnalyzed: analysis.totalGames,
        home: {
          games: analysis.homeScores.length,
          average: Number(analysis.homeAverage.toFixed(2)),
          scores: analysis.homeScores,
        },
        away: {
          games: analysis.awayScores.length,
          average: Number(analysis.awayAverage.toFixed(2)),
          scores: analysis.awayScores,
        },
        homeAdvantageFactor: Number(analysis.homeAdvantageFactor.toFixed(4)),
      };
      console.error(JSON.stringify(outputData, null, 2));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);

    if (message.includes("not found")) {
      console.error("\n⚠️  Player not found!");
      console.error("Check the player slug is correct.");
      console.error("Example: kylian-mbappe, erling-haaland");
    } else if (message.includes("Unauthorized") || message.includes("auth")) {
      console.error("\n⚠️  Authentication required!");
      console.error("Set SORARE_JWT_TOKEN in .env.local");
      console.error("Run: pnpm import-token <your-jwt-token>");
    }

    process.exit(1);
  }
}

main();
