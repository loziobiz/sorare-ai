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
          anyPlayer {
            activeClub {
              name
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
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
