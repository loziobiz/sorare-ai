import { readFileSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(import.meta.dirname, "../../data");

interface MlsPlayer {
  slug: string;
  displayName: string;
  name?: string;
  positionTyped?: string;
  position?: string;
  activeClub?: {
    slug: string;
    name: string;
  };
  clubSlug?: string;
  clubName?: string;
}

interface MlsPlayersData {
  extractedAt: string;
  totalPlayers: number;
  players: MlsPlayer[];
}

export function loadMlsPlayers(): MlsPlayer[] {
  try {
    const data = JSON.parse(
      readFileSync(resolve(DATA_DIR, "mls-players.json"), "utf-8"),
    ) as MlsPlayersData;
    return data.players;
  } catch (error) {
    console.error("Failed to load MLS players:", error);
    process.exit(1);
  }
}
