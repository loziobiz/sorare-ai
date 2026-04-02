#!/usr/bin/env tsx
/**
 * MLS L10 vs Projected Score (Remote API)
 *
 * Fetches from the worker endpoint /api/players/analysis/proj-vs-l10
 * and displays a formatted table sorted by L10 ascending.
 *
 * Usage:
 *   pnpm mls-l10-vs-proj
 *   pnpm mls-l10-vs-proj --limit=50     # Limit results (default: 50)
 *   pnpm mls-l10-vs-proj --position=FW  # Filter by position (GK, DF, MD, FW)
 */

const API_BASE = "https://mls-sync.alebisi.it";

interface PlayerRow {
  slug: string;
  name: string;
  clubCode: string;
  position: string;
  l10: number;
  proj: number;
  diff: number;
  starterPct: number;
}

interface ApiResponse {
  analysis: string;
  league: string;
  count: number;
  players: PlayerRow[];
}

const POSITION_MAP: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DF",
  Midfielder: "MD",
  Forward: "FW",
};

function parseArgs(): { limit: number; position?: string } {
  const args = process.argv.slice(2);
  let limit = 50;
  let position: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--position=")) {
      position = arg.split("=")[1].toUpperCase();
    }
  }

  return { limit, position };
}

async function fetchAnalysis(limit: number): Promise<ApiResponse> {
  const url = `${API_BASE}/api/players/analysis/proj-vs-l10?league=Major+League+Soccer&limit=${limit}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ApiResponse>;
}

async function main() {
  const { limit, position } = parseArgs();

  const data = await fetchAnalysis(200);

  let rows = data.players.map((p) => ({
    ...p,
    role: POSITION_MAP[p.position] ?? "??",
  }));

  if (position) {
    const validPositions = Object.values(POSITION_MAP);
    if (!validPositions.includes(position)) {
      console.error(`Invalid position: ${position}. Use: GK, DF, MD, FW`);
      process.exit(1);
    }
    rows = rows.filter((r) => r.role === position);
  }

  const display = rows.slice(0, limit);

  console.log(`\nMLS Proj > L10 (starter > 50%) — ${display.length} players\n`);

  const nameWidth = Math.min(
    Math.max(...display.map((r) => r.name.length), 4),
    25
  );
  const header = [
    "#".padStart(3),
    "Name".padEnd(nameWidth),
    "Team",
    "Pos",
    "L10".padStart(5),
    "Proj".padStart(5),
    "Diff".padStart(6),
    "Start%".padStart(6),
  ].join("  ");

  console.log(header);
  console.log("-".repeat(header.length));

  for (let i = 0; i < display.length; i++) {
    const r = display[i];
    console.log(
      [
        String(i + 1).padStart(3),
        r.name.slice(0, nameWidth).padEnd(nameWidth),
        r.clubCode.padEnd(4),
        r.role.padEnd(3),
        String(r.l10).padStart(5),
        String(r.proj).padStart(5),
        `+${r.diff}`.padStart(6),
        `${r.starterPct}%`.padStart(6),
      ].join("  ")
    );
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
