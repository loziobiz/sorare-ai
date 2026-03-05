#!/usr/bin/env tsx
/**
 * Extract MLS Players
 *
 * Fetches all player slugs from MLS teams and updates mls-players.json.
 * Preserves existing statistics while updating base player information.
 *
 * Usage:
 *   pnpm extract-mls-players
 *   pnpm extract-mls-players --dry-run      # Show what would change
 *   pnpm extract-mls-players --prune        # Remove players no longer in MLS
 */

import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import {
  createPlayerRepository,
  type MlsPlayersDatabase,
  type PlayerRecord,
} from "../lib/repository.js";
import { SorareClient } from "../lib/sorare-client.js";

config({ path: ".env.local" });
config({ path: ".env" });

const GET_MLS_COMPETITION = `
  query GetMlsCompetition {
    football {
      competition(slug: "mls") {
        slug
        name
        clubs(first: 50) {
          edges {
            node {
              slug
              name
              code
            }
          }
        }
      }
    }
  }
`;

const GET_CLUB_PLAYERS = `
  query GetClubPlayers($slug: String!) {
    football {
      club(slug: $slug) {
        slug
        name
        code
        activePlayers(first: 50) {
          edges {
            node {
              slug
              displayName
              anyPositions
              activeClub {
                slug
                name
                code
              }
            }
          }
        }
      }
    }
  }
`;

interface GraphQLPlayer {
  slug: string;
  displayName: string;
  anyPositions: string[];
  activeClub: {
    slug: string;
    name: string;
    code?: string;
  } | null;
}

interface GraphQLClub {
  slug: string;
  name: string;
  code?: string;
  activePlayers?: {
    edges: {
      node: GraphQLPlayer;
    }[];
  };
}

interface CompetitionData {
  football: {
    competition: {
      slug: string;
      name: string;
      clubs: {
        edges: {
          node: GraphQLClub;
        }[];
      };
    };
  };
}

interface ClubData {
  football: {
    club: GraphQLClub;
  };
}

function parseArgs(): { dryRun: boolean; prune: boolean } {
  const args = process.argv.slice(2);

  const dryRun = args.includes("--dry-run");
  const prune = args.includes("--prune");

  return { dryRun, prune };
}

async function main() {
  const { dryRun, prune } = parseArgs();

  console.log("🔍 Fetching MLS competition and clubs...");

  const client = new SorareClient();
  const repository = createPlayerRepository();

  // Carica database esistente se presente
  let existingDb: MlsPlayersDatabase | null = null;
  let existingPlayers = new Map<string, PlayerRecord>();

  try {
    existingDb = await repository.load();
    existingPlayers = new Map(existingDb.players.map((p) => [p.slug, p]));
    console.log(
      `📁 Loaded existing database with ${existingPlayers.size} players`
    );
  } catch {
    console.log("📁 No existing database found, creating new one");
  }

  try {
    const data = await client.query<CompetitionData>(GET_MLS_COMPETITION);

    if (!data.football?.competition) {
      console.error("❌ MLS competition not found");
      process.exit(1);
    }

    console.log(`✅ Found competition: ${data.football.competition.name}`);

    const allClubs: GraphQLClub[] = [];
    const clubEdges = data.football.competition.clubs.edges;

    console.log(`📋 Found ${clubEdges.length} clubs, fetching players...`);

    // Fetch players for each club
    for (let i = 0; i < clubEdges.length; i++) {
      const clubNode = clubEdges[i].node;
      console.log(`  [${i + 1}/${clubEdges.length}] ${clubNode.name}...`);

      try {
        const clubData = await client.query<ClubData>(GET_CLUB_PLAYERS, {
          slug: clubNode.slug,
        });

        if (clubData.football?.club) {
          allClubs.push(clubData.football.club);
        }

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err) {
        console.warn("    ⚠️ Failed:", err instanceof Error ? err.message : err);
      }
    }
    console.log(`✅ Fetched ${allClubs.length} clubs`);

    // Extract all players currently at MLS clubs
    const newPlayers: PlayerRecord[] = [];
    const seenSlugs = new Set<string>();
    let addedCount = 0;
    let updatedCount = 0;
    let preservedCount = 0;

    for (const club of allClubs) {
      let clubPlayerCount = 0;

      for (const edge of club.activePlayers?.edges || []) {
        const player = edge.node;

        // Only include players currently at this club and not already seen
        if (
          player.activeClub?.slug === club.slug &&
          !seenSlugs.has(player.slug)
        ) {
          // Get primary position (first in array)
          const position = player.anyPositions?.[0] || "Unknown";

          // Verifica se il giocatore esiste già
          const existing = existingPlayers.get(player.slug);

          if (existing) {
            // Giocatore esistente - aggiorna dati base ma preserva stats
            const updatedPlayer: PlayerRecord = {
              ...existing,
              name: player.displayName,
              clubSlug: club.slug,
              clubName: club.name,
              clubCode: club.code || player.activeClub?.code,
              position,
            };

            // Verifica se ci sono cambiamenti reali
            const hasChanges =
              existing.name !== updatedPlayer.name ||
              existing.clubSlug !== updatedPlayer.clubSlug ||
              existing.position !== updatedPlayer.position;

            if (hasChanges) {
              updatedCount++;
            } else {
              preservedCount++;
            }

            newPlayers.push(updatedPlayer);
          } else {
            // Nuovo giocatore
            newPlayers.push({
              slug: player.slug,
              name: player.displayName,
              clubSlug: club.slug,
              clubName: club.name,
              clubCode: club.code || player.activeClub?.code,
              position,
            });
            addedCount++;
          }

          seenSlugs.add(player.slug);
          clubPlayerCount++;
        }
      }

      console.log(`  📋 ${club.name}: ${clubPlayerCount} active players`);
    }

    // Identifica giocatori da rimuovere (se --prune)
    const removedPlayers: string[] = [];
    if (prune) {
      for (const [slug, player] of existingPlayers) {
        if (!seenSlugs.has(slug)) {
          removedPlayers.push(slug);
        }
      }
    }

    console.log("\n📊 Player Changes:");
    console.log(`  + Added: ${addedCount} new players`);
    console.log(`  ~ Updated: ${updatedCount} existing players`);
    console.log(`  = Preserved: ${preservedCount} unchanged`);
    console.log(
      `  - Removed: ${prune ? removedPlayers.length : "(use --prune to remove)"}`
    );
    console.log(`\n📊 Total MLS players: ${newPlayers.length}`);

    if (removedPlayers.length > 0 && prune) {
      console.log(
        `\n⚠️  Removing ${removedPlayers.length} players no longer in MLS:`
      );
      removedPlayers.forEach((slug) => console.log(`   - ${slug}`));
    }

    // Sort by club then name
    newPlayers.sort((a, b) => {
      if (a.clubName !== b.clubName) {
        return a.clubName.localeCompare(b.clubName);
      }
      return a.name.localeCompare(b.name);
    });

    // Prepare output
    //const slugsOnly = newPlayers.map((p) => p.slug);

    const outputData: MlsPlayersDatabase = {
      league: "Major League Soccer",
      leagueSlug: "major-league-soccer",
      season: new Date().getFullYear(),
      totalPlayers: newPlayers.length,
      totalClubs: allClubs.length,
      /*
      clubs: allClubs.map(c => ({
        slug: c.slug,
        name: c.name,
        playerCount: newPlayers.filter(p => p.clubSlug === c.slug).length,
      })),
      */
      players: newPlayers,
      extractedAt: new Date().toISOString(),
      version: (existingDb?.version || 0) + 1,
    };

    if (dryRun) {
      console.log("\n🏃 Dry run mode - no changes saved");
      console.log(
        `   Would save ${outputData.totalPlayers} players to mls-players.json`
      );
      console.log("\n📝 Sample players (first 10):");
      newPlayers.slice(0, 10).forEach((p) => {
        const status = existingPlayers.has(p.slug) ? "~" : "+";
        console.log(`  ${status} ${p.name} (${p.clubName})`);
      });
      if (newPlayers.length > 10) {
        console.log(`  ... and ${newPlayers.length - 10} more`);
      }
    } else {
      // Salva nel file ./data/mls-players.json
      const outputPath = resolve("./data/mls-players.json");
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 Saved to: ${outputPath}`);

      // Print sample
      console.log("\n📝 Sample players:");
      newPlayers.slice(0, 10).forEach((p) => {
        console.log(`  - ${p.name} (${p.clubName})`);
      });
      if (newPlayers.length > 10) {
        console.log(`  ... and ${newPlayers.length - 10} more`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
