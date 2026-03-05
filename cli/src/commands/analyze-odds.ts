#!/usr/bin/env tsx
/**
 * Analyze Odds - Probabilità di Titolarità e Vittoria
 *
 * Scarica per ogni giocatore MLS:
 * - Probabilità di titolarità (starterOdds)
 * - Probabilità di vittoria della squadra (winOdds)
 *
 * Salva in mls-players.json in player.stats.odds
 *
 * Usage:
 *   pnpm analyze-odds
 *   pnpm analyze-odds --limit=10        # Solo primi 10 giocatori
 *   pnpm analyze-odds --dry-run         # Anteprima senza salvare
 *   pnpm analyze-odds --delay=500       # Delay tra richieste (ms)
 */

import { config } from "dotenv";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";
import { SorareClient } from "../lib/sorare-client.js";
import {
  createPlayerRepository,
  type PlayerRecord,
  type PlayerStats,
  type OddsStats,
  type NextFixtureOdds,
  type StartingOdds,
  type WinOdds,
} from "../lib/repository.js";

config({ path: ".env.local" });
config({ path: ".env" });

const STATE_FILE = "./data/.analyze-odds-state.json";

interface State {
  completed: string[];
  failed: string[];
  totalPlayers: number;
}

// Query GraphQL per probabilità
const GET_PLAYER_ODDS = `
  query GetPlayerOdds($slug: String!) {
    players(slugs: [$slug]) {
      ... on Player {
        slug
        displayName
        activeClub {
          name
        }
        nextClassicFixturePlayingStatusOdds {
          starterOddsBasisPoints
        }
        nextGame(so5FixtureEligible: true) {
          date
          homeTeam {
            name
            code
          }
          awayTeam {
            name
            code
          }
          homeStats {
            ... on FootballTeamGameStats {
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
          awayStats {
            ... on FootballTeamGameStats {
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
        }
      }
    }
  }
`;

interface GraphQLPlayerOdds {
  slug: string;
  displayName: string;
  activeClub: { name: string } | null;
  nextClassicFixturePlayingStatusOdds: {
    starterOddsBasisPoints: number;
  } | null;
  nextGame: {
    date: string;
    homeTeam: { name: string; code?: string };
    awayTeam: { name: string; code?: string };
    homeStats: {
      winOddsBasisPoints?: number;
      drawOddsBasisPoints?: number;
      loseOddsBasisPoints?: number;
    } | null;
    awayStats: {
      winOddsBasisPoints?: number;
      drawOddsBasisPoints?: number;
      loseOddsBasisPoints?: number;
    } | null;
  } | null;
}

interface GraphQLResponse {
  players: GraphQLPlayerOdds[];
}

function parseArgs(): {
  limit?: number;
  delay: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);

  let limit: number | undefined;
  let delay = 500; // Default 500ms tra richieste
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--delay=")) {
      delay = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { limit, delay, dryRun };
}

function loadState(): State {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(
        require("fs").readFileSync(STATE_FILE, "utf-8")
      ) as State;
    } catch {
      console.log("⚠️  Failed to load state, starting fresh");
    }
  }
  return { completed: [], failed: [], totalPlayers: 0 };
}

function saveState(state: State): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Converte basis points in percentuale (0-100)
 */
function basisPointsToPercentage(basisPoints: number | null | undefined): number | null {
  if (basisPoints == null) return null;
  return Math.round(basisPoints / 100);
}

async function analyzePlayerOdds(
  client: SorareClient,
  slug: string
): Promise<OddsStats | null> {
  try {
    const response = await client.query<GraphQLResponse>(GET_PLAYER_ODDS, {
      slug,
    });

    if (!response.players || response.players.length === 0) {
      return null;
    }

    const player = response.players[0];
    const clubName = player.activeClub?.name;

    // Estrai probabilità di titolarità (solo starter %)
    let startingOdds: StartingOdds | null = null;
    if (player.nextClassicFixturePlayingStatusOdds) {
      startingOdds = {
        starterOddsBasisPoints: player.nextClassicFixturePlayingStatusOdds.starterOddsBasisPoints,
      };
    }

    // Estrai probabilità di vittoria
    let nextFixture: NextFixtureOdds | null = null;
    if (player.nextGame && clubName) {
      const game = player.nextGame;
      
      // Determina se il giocatore è in casa o in trasferta
      const isHome = game.homeTeam.name === clubName;
      const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
      
      // Prendi le probabilità della squadra corretta
      let teamWinOdds: WinOdds | null = null;
      if (isHome && game.homeStats) {
        teamWinOdds = {
          winOddsBasisPoints: game.homeStats.winOddsBasisPoints ?? 0,
          drawOddsBasisPoints: game.homeStats.drawOddsBasisPoints ?? 0,
          loseOddsBasisPoints: game.homeStats.loseOddsBasisPoints ?? 0,
        };
      } else if (!isHome && game.awayStats) {
        teamWinOdds = {
          winOddsBasisPoints: game.awayStats.winOddsBasisPoints ?? 0,
          drawOddsBasisPoints: game.awayStats.drawOddsBasisPoints ?? 0,
          loseOddsBasisPoints: game.awayStats.loseOddsBasisPoints ?? 0,
        };
      }

      nextFixture = {
        fixtureDate: game.date,
        opponent,
        isHome,
        startingOdds,
        teamWinOdds,
      };
    }

    return {
      calculatedAt: new Date().toISOString(),
      nextFixture,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`   ⚠️ Error fetching odds for ${slug}: ${message}`);
    return null;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatOddsDisplay(odds: OddsStats | null): string {
  if (!odds?.nextFixture?.startingOdds) {
    return "No odds available";
  }

  const { startingOdds, teamWinOdds, isHome, opponent } = odds.nextFixture;
  const starter = basisPointsToPercentage(startingOdds.starterOddsBasisPoints);

  let display = `Starter: ${starter}%`;

  if (teamWinOdds) {
    const win = basisPointsToPercentage(teamWinOdds.winOddsBasisPoints);
    const location = isHome ? "vs" : "@";
    display += ` | Win: ${win}% ${location} ${opponent}`;
  }

  return display;
}

async function main() {
  const { limit, delay, dryRun } = parseArgs();

  console.log("🚀 Starting Odds Analysis (Starter % / Win %)");
  console.log("=".repeat(50));

  // Load database
  const repository = createPlayerRepository();
  let db;
  try {
    db = await repository.load();
  } catch (error) {
    console.error("❌ Failed to load MLS database. Run: pnpm extract-mls-players");
    process.exit(1);
  }

  console.log(`📊 Found ${db.players.length} MLS players in database`);

  // Filter players
  let playersToAnalyze = db.players;
  if (limit) {
    playersToAnalyze = playersToAnalyze.slice(0, limit);
    console.log(`🔍 Limited to ${playersToAnalyze.length} players`);
  }

  // Load state
  const state = loadState();
  state.totalPlayers = playersToAnalyze.length;

  // Filter out already analyzed
  const remaining = playersToAnalyze.filter(
    (p) => !state.completed.includes(p.slug) && !state.failed.includes(p.slug)
  );

  console.log(`✅ ${state.completed.length} already analyzed`);
  console.log(`❌ ${state.failed.length} previously failed`);
  console.log(`⏳ ${remaining.length} remaining to analyze`);
  if (dryRun) {
    console.log(`🏃 Dry run mode - no changes will be saved`);
  }
  console.log();

  const client = new SorareClient();
  const updates: Array<{ slug: string; data: Partial<PlayerRecord> }> = [];
  let processed = 0;
  let errors = 0;

  for (const player of remaining) {
    processed++;
    console.log(
      `[${processed}/${remaining.length}] Analyzing ${player.name} (${player.clubName})...`
    );

    const odds = await analyzePlayerOdds(client, player.slug);

    if (odds === null) {
      console.log(`   ❌ Failed to fetch odds`);
      state.failed.push(player.slug);
      errors++;
    } else {
      const display = formatOddsDisplay(odds);
      console.log(`   ✅ ${display}`);

      // Prepara update per repository
      if (!dryRun) {
        const stats: PlayerStats = {
          ...player.stats,
          odds,
        };

        updates.push({
          slug: player.slug,
          data: { stats },
        });
      }

      state.completed.push(player.slug);
    }

    // Save progress every 10 players
    if (!dryRun && updates.length > 0 && updates.length % 10 === 0) {
      console.log(`     💾 Saving batch of ${updates.length} players...`);
      await repository.updateMany(updates);
      updates.length = 0;
    }

    // Save state
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

  // Show some stats from saved data
  const updatedDb = dryRun ? db : await repository.load();
  const withOdds = updatedDb.players.filter(
    (p) => p.stats?.odds?.nextFixture?.startingOdds != null
  );
  const withWinOdds = updatedDb.players.filter(
    (p) => p.stats?.odds?.nextFixture?.teamWinOdds != null
  );

  console.log();
  console.log(`📈 Players with starting odds: ${withOdds.length}`);
  console.log(`📈 Players with win odds: ${withWinOdds.length}`);

  // Top 5 by starter percentage
  const topStarters = withOdds
    .sort(
      (a, b) =>
        (b.stats!.odds!.nextFixture!.startingOdds!.starterOddsBasisPoints || 0) -
        (a.stats!.odds!.nextFixture!.startingOdds!.starterOddsBasisPoints || 0)
    )
    .slice(0, 5);

  console.log();
  console.log("🏆 Top 5 Players by Starting Odds:");
  topStarters.forEach((p, i) => {
    const odds = p.stats!.odds!.nextFixture!.startingOdds!;
    const pct = basisPointsToPercentage(odds.starterOddsBasisPoints);
    console.log(
      `   ${i + 1}. ${p.name} (${p.clubName}) - ${pct}%`
    );
  });
}

main().catch(console.error);
