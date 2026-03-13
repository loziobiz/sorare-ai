/**
 * GraphQL queries for Worker handlers
 */

// ============================================================================
// EXTRACT PLAYERS QUERIES
// ============================================================================

export const GET_MLS_COMPETITION = `
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

export const GET_CLUB_PLAYERS = `
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

// ============================================================================
// HOME/AWAY ANALYSIS QUERIES
// ============================================================================

export const GET_PLAYER_INFO = `
  query GetPlayerInfo($slug: String!) {
    players(slugs: [$slug]) {
      slug
      displayName
      activeClub {
        name
      }
    }
  }
`;

export const GET_PLAYERS_GAME_SCORES = `
  query GetPlayersGameScores($slugs: [String!]!, $last: Int!) {
    players(slugs: $slugs) {
      ... on Player {
        slug
        displayName
        activeClub {
          name
        }
        allPlayerGameScores(first: $last) {
          edges {
            node {
              ... on PlayerGameScore {
                score
                scoreStatus
                anyGame {
                  date
                  homeTeam {
                    name
                  }
                  awayTeam {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ============================================================================
// AA ANALYSIS QUERIES
// ============================================================================

// Query per singolo giocatore - usa football.player (non players)
// allPlayerGameScores richiede query su singolo player, non su lista
export const GET_PLAYER_AA_SCORES = `
  query GetPlayerAAScores($slug: String!, $last: Int!) {
    football {
      player(slug: $slug) {
        ... on Player {
          slug
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

// ============================================================================
// ODDS ANALYSIS QUERIES
// ============================================================================

export const GET_PLAYER_ODDS = `
  query GetPlayerOdds($slugs: [String!]!) {
    players(slugs: $slugs) {
      ... on Player {
        slug
        displayName
        activeClub {
          name
        }
        nextClassicFixtureProjectedScore
        nextClassicFixturePlayingStatusOdds {
          starterOddsBasisPoints
        }
        nextGame(so5FixtureEligible: true) {
          id
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
              winOdds
              winOddsBasisPoints
              drawOddsBasisPoints
              loseOddsBasisPoints
            }
          }
          awayStats {
            ... on FootballTeamGameStats {
              winOdds
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

export const GET_PLAYER_FALLBACK_STARTING_ODDS = `
  query GetPlayerFallbackStartingOdds($slug: String!) {
    players(slugs: [$slug]) {
      ... on Player {
        slug
        nextGame(so5FixtureEligible: true) {
          playerGameScore(playerSlug: $slug) {
            ... on PlayerGameScore {
              projectedScore
              footballPlayerGameStats {
                footballPlayingStatusOdds(newVersion: true) {
                  starterOddsBasisPoints
                }
              }
            }
          }
        }
      }
    }
  }
`;
