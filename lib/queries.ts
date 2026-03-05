export const GET_SO5_RESULTS_QUERY = `
  query GetSo5Results($slug: String!) {
    so5 {
      so5Fixture(slug: $slug, sport: FOOTBALL) {
        slug
        gameWeek
        displayName
        startDate
        endDate
        mySo5Lineups(draft: false) {
          id
          name
          so5Leaderboard {
            slug
            displayName
            division
          }
          so5Appearances {
            id
            captain
            score
            bonusPoints
            anyCard {
              slug
              name
              rarityTyped
              pictureUrl
            }
            anyPlayer {
              ... on Player {
                displayName
                slug
              }
            }
          }
        }
        mySo5Rankings(first: 50) {
          ranking
          score
          eligibleForReward
          so5Rewards {
            id
            amount {
              eurCents
            }
          }
        }
      }
    }
  }
`;

export const GET_SO5_FIXTURES_QUERY = `
  query GetSo5Fixtures($sport: Sport!, $eventType: So5FixtureEvent!, $last: Int, $future: Boolean) {
    so5 {
      allSo5Fixtures(sport: $sport, eventType: $eventType, last: $last, future: $future) {
        nodes {
          slug
          gameWeek
          displayName
          startDate
          endDate
        }
      }
    }
  }
`;

export const GET_CARDS_QUERY = `
  query GetCards($after: String) {
    currentUser {
      slug
      cards(first: 100, after: $after, rarities: [limited, rare]) {
        nodes {
          slug
          name
          rarityTyped
          anyPositions
          pictureUrl
          inSeasonEligible
          cardPrice
          lowestPriceCard {
            slug
            cardPrice
          }
          latestPrimaryOffer {
            price {
              eurCents
              usdCents
              referenceCurrency
            }
            status
          }
          priceRange {
            min
            max
          }
          anyPlayer {
            activeClub {
              name
              code
              pictureUrl
              activeCompetitions {
                name
                displayName
                format
                country {
                  code
                  name
                }
              }
            }
            ... on Player {
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
              nextClassicFixturePlayingStatusOdds {
                starterOddsBasisPoints
                substituteOddsBasisPoints
                nonPlayingOddsBasisPoints
                reliability
                providerIconUrl
              }
            }
          }
          l5Average: averageScore(type: LAST_FIVE_SO5_AVERAGE_SCORE)
          l10Average: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
          l15Average: averageScore(type: LAST_FIFTEEN_SO5_AVERAGE_SCORE)
          l40Average: averageScore(type: LAST_FORTY_SO5_AVERAGE_SCORE)
          power
          powerBreakdown {
            xp
            season
          }
          sealed
          sealedAt
          ownershipHistory {
            amounts {
              eurCents
              referenceCurrency
            }
            from
            transferType
          }
          liveSingleSaleOffer {
            owners {
              amounts {
                eurCents
                referenceCurrency
              }
            }
          }
          privateMinPrices {
            eurCents
            referenceCurrency
          }
          publicMinPrices {
            eurCents
            referenceCurrency
          }
          ... on Card {
            so5Scores(last: 10) {
              score
              projectedScore
              scoreStatus
              game {
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
