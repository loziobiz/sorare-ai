/**
 * GraphQL queries for player analytics
 */

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

export const GET_PLAYER_GAME_SCORES = `
  query GetPlayerGameScores($slug: String!, $last: Int!) {
    football {
      player(slug: $slug) {
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


