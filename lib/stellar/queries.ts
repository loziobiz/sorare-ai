export const GET_CARD_SETS_AND_USER = `
  query GetCardSetsAndUser {
    currentUser {
      slug
    }
    cardSets(active: true, first: 10) {
      nodes {
        id
        name
        slug
        active
      }
    }
  }
`;

/** Step 1: fetch collection slugs (lightweight, no nested restricted fields) */
export const GET_STELLAR_COLLECTION_SLUGS = `
  query GetStellarCollectionSlugs($cardSetSlug: String!, $after: String) {
    currentUser {
      cardCollections(cardSetSlug: $cardSetSlug, sport: FOOTBALL, first: 50, after: $after) {
        nodes {
          name
          slug
          rarity
          inSeason
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/** Step 2: fetch single collection with cards (root query, no list nesting) */
export const GET_COLLECTION_CARDS = `
  query GetCollectionCards($slug: String!, $userSlug: String!) {
    cardCollection(slug: $slug) {
      name
      slug
      rarity
      inSeason
      userCardCollection(forUserSlug: $userSlug) {
        score
        bonus
        complete
        fulfilledSlotsCount
        slotsCount
        cardCollectionCards {
          id
          heldSince
          scoreBreakdown {
            total
          }
          anyCard {
            slug
            name
            pictureUrl(derivative: "tinified")
            rarityTyped
            anyPositions
            power
            cardEditionName
            l10Average: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
            anyPlayer {
              ... on Player {
                displayName
                activeClub {
                  name
                  pictureUrl
                }
                nextClassicFixtureProjectedScore
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
                }
              }
            }
          }
        }
      }
    }
  }
`;
