/**
 * Type definitions for player analytics
 */

export interface PlayerGameScore {
  score: number;
  scoreStatus: string;
  anyGame: {
    date: string;
    homeTeam: { name: string };
    awayTeam: { name: string };
  };
}

export interface PlayerGameScoreEdge {
  node: PlayerGameScore;
}

export interface Player {
  slug: string;
  displayName: string;
  activeClub: {
    name: string;
  } | null;
  allPlayerGameScores: {
    edges: PlayerGameScoreEdge[];
  };
}

export interface PlayersData {
  players: Player[];
}

export interface PlayerData {
  football: {
    player: Player;
  };
}

export interface HomeAwayAnalysis {
  player: Player;
  homeScores: number[];
  awayScores: number[];
  homeAverage: number;
  awayAverage: number;
  homeAdvantageFactor: number;
  totalGames: number;
}

export interface PlayerStatsData {
  slug: string;
  displayName: string;
  clubName?: string;
  position?: string;
  calculatedAt: string;
  gamesAnalyzed: number;
  home: {
    games: number;
    average: number;
  };
  away: {
    games: number;
    average: number;
  };
  homeAdvantageFactor: number;
  tags?: string[];
}
