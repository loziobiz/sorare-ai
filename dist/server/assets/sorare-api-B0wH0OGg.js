import { jsxs, jsx } from "react/jsx-runtime";
import { RefreshCw, Loader2, CreditCard, Layers, Save } from "lucide-react";
import { useLocation, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Dexie } from "dexie";
import { c as createSsrRpc } from "./auth-server-BVOMZ7KW.js";
import { c as createServerFn } from "../server.js";
const ICON_MAP = {
  loader: Loader2,
  refresh: RefreshCw
};
function LoadingSpinner({
  icon = "loader",
  message
}) {
  const Icon = ICON_MAP[icon];
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center space-y-4 py-12", children: [
    /* @__PURE__ */ jsx(Icon, { className: "h-8 w-8 animate-spin text-muted-foreground" }),
    message && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: message })
  ] });
}
const navItems = [
  { href: "/cards", label: "Le mie Carte", icon: CreditCard },
  { href: "/lineup", label: "Crea Formazione", icon: Layers },
  { href: "/saved-lineups", label: "Formazioni Salvate", icon: Save }
];
function SiteNav() {
  const location = useLocation();
  const pathname = location.pathname;
  return /* @__PURE__ */ jsx("nav", { className: "mb-4 flex items-center gap-2 border-slate-200 border-b pb-0", children: navItems.map((item) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    return /* @__PURE__ */ jsxs(
      Link,
      {
        className: `flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-colors ${isActive ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
            `,
        to: item.href,
        children: [
          /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" }),
          item.label
        ]
      },
      item.href
    );
  }) });
}
class SorareDB extends Dexie {
  constructor() {
    super("SorareDB");
    this.version(2).stores({
      cachedCards: "slug, userSlug, timestamp, rarityFilter",
      cache: "key, timestamp",
      savedFormations: "++id, league, createdAt"
    });
  }
}
const db = new SorareDB();
const DEFAULT_TTL$1 = {
  // 30 minuti
  LONG: 24 * 60 * 60 * 1e3
};
async function cleanupExpiredCache() {
  const now = Date.now();
  const expiredKeys = [];
  await db.cache.toCollection().each((entry) => {
    if (entry.ttl && now - entry.timestamp > entry.ttl) {
      expiredKeys.push(entry.key);
    }
  });
  if (expiredKeys.length > 0) {
    await db.cache.bulkDelete(expiredKeys);
  }
}
function useCacheCleanup(intervalMs = 60 * 60 * 1e3) {
  const [isCleaned, setIsCleaned] = useState(false);
  useEffect(() => {
    const cleanup = async () => {
      await cleanupExpiredCache();
      setIsCleaned(true);
    };
    cleanup();
    const interval = setInterval(cleanup, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
  return isCleaned;
}
const ENABLE_PAGINATION = true;
const ACTIVE_LEAGUES = {
  "Serie A|it": "Serie A",
  "Premier League|gb-eng": "Premier League",
  "Primera División|es": "La Liga",
  "Bundesliga|de": "Bundesliga",
  "Bundesliga|at": "Bundesliga Austria",
  "Ligue 1|fr": "Ligue 1",
  "First Division A|be": "Jupiler Pro League",
  "MLS|us": "MLS",
  "Eredivisie|nl": "Eredivisie",
  "Liga Portugal|pt": "Liga Portugal"
};
const ETH_TO_EUR_RATE = 2653;
const CACHE_NAME = "sorare-graphql-cache";
const DEFAULT_TTL = 24 * 60 * 60 * 1e3;
class GraphQLCache {
  constructor() {
    this.cache = null;
  }
  async init() {
    if (this.cache) {
      return;
    }
    try {
      this.cache = await caches.open(CACHE_NAME);
    } catch {
      console.warn("Cache API not available");
    }
  }
  generateKey(request) {
    const key = JSON.stringify({
      query: request.query,
      variables: request.variables
    });
    return `/graphql/${btoa(key)}`;
  }
  isExpired(entry) {
    if (!entry.ttl) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }
  async get(request) {
    await this.init();
    if (!this.cache) {
      return null;
    }
    try {
      const key = this.generateKey(request);
      const response = await this.cache.match(key);
      if (!response) {
        return null;
      }
      const entry = await response.json();
      if (this.isExpired(entry)) {
        await this.cache.delete(key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }
  async set(request, data, ttl = DEFAULT_TTL) {
    await this.init();
    if (!this.cache) {
      return;
    }
    try {
      const key = this.generateKey(request);
      const entry = {
        data,
        timestamp: Date.now(),
        ttl
      };
      const response = Response.json(entry);
      await this.cache.put(key, response);
    } catch {
    }
  }
  async invalidate(request) {
    await this.init();
    if (!this.cache) {
      return;
    }
    if (request) {
      const key = this.generateKey(request);
      await this.cache?.delete(key);
    } else {
      const keys = await this.cache.keys();
      await Promise.all(keys.map((key) => this.cache?.delete(key)));
    }
  }
  async clear() {
    await this.init();
    if (!this.cache) {
      return;
    }
    const keys = await this.cache.keys();
    await Promise.all(
      keys.map(async (key) => {
        if (this.cache) {
          await this.cache.delete(key);
        }
      })
    );
  }
  async getSize() {
    await this.init();
    if (!this.cache) {
      return 0;
    }
    const keys = await this.cache.keys();
    return keys.length;
  }
}
const graphqlCache = new GraphQLCache();
async function cachedFetch(request, fetcher, ttl) {
  const cached = await graphqlCache.get(request);
  if (cached) {
    return cached;
  }
  const data = await fetcher();
  await graphqlCache.set(request, data, ttl);
  return data;
}
const GET_CARDS_QUERY = `
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
const graphqlProxy = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("839441a41d5dbe2adf36bea048fa4b81e937fbb4fef4a9b95d1c3bfd0513a0ca"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("1cb658687d1b8c9f8e9d3cf81d4ea8805f29e8e2850d15eedb26d14b1f07b87c"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("e44da196012487c25bff7773c9ff6ae16e361129d744e208d7ca1e80d14af995"));
const DEFAULT_CACHE_TTL = 30 * 60 * 1e3;
async function fetchCardsPage({
  cursor,
  signal,
  useCache = true,
  cacheTtl = DEFAULT_CACHE_TTL
} = {}) {
  const request = {
    query: GET_CARDS_QUERY,
    variables: { after: cursor }
  };
  const fetcher = async () => {
    const result = await graphqlProxy({
      data: {
        query: GET_CARDS_QUERY,
        variables: { after: cursor }
      }
    });
    if (!result.data?.currentUser) {
      return { cards: [], cursor: null };
    }
    const newCards = (result.data.currentUser.cards?.nodes || []).filter(
      (card) => {
        const competitions = card.anyPlayer?.activeClub?.activeCompetitions || [];
        return !competitions.some((c) => c.name === "NBA");
      }
    );
    if (newCards.length > 0) {
      console.log("DEBUG - First card price data:", {
        slug: newCards[0].slug,
        ownershipHistory: newCards[0].ownershipHistory,
        liveSingleSaleOffer: newCards[0].liveSingleSaleOffer,
        privateMinPrices: newCards[0].privateMinPrices,
        publicMinPrices: newCards[0].publicMinPrices,
        lowestPriceCard: newCards[0].lowestPriceCard
      });
    }
    const pageInfo = result.data.currentUser.cards?.pageInfo;
    const nextCursor = pageInfo?.hasNextPage ? pageInfo?.endCursor : null;
    return {
      cards: newCards,
      cursor: nextCursor,
      userSlug: result.data.currentUser.slug
    };
  };
  if (useCache) {
    return await cachedFetch(request, fetcher, cacheTtl);
  }
  return await fetcher();
}
async function fetchAllCards(options = {}) {
  const {
    onProgress,
    enablePagination = true,
    pageDelay = 1100,
    signal,
    cacheTtl = DEFAULT_CACHE_TTL
  } = options;
  const allCards = [];
  let cursor = null;
  let pageCount = 0;
  let userSlug = "";
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  do {
    pageCount++;
    const result = await fetchCardsPage({
      cacheTtl,
      cursor,
      signal,
      useCache: pageCount === 1
      // Usa cache solo per la prima pagina
    });
    allCards.push(...result.cards);
    if (result.userSlug) {
      userSlug = result.userSlug;
    }
    onProgress?.(pageCount, allCards.length);
    cursor = result.cursor;
    if (cursor && !enablePagination) {
      break;
    }
    if (cursor) {
      await delay(pageDelay);
    }
  } while (cursor);
  return { cards: allCards, userSlug };
}
async function clearAllCaches() {
  await graphqlCache.clear();
  await db.cache.clear();
  await db.cachedCards.clear();
  if (typeof caches !== "undefined") {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
}
export {
  ACTIVE_LEAGUES as A,
  DEFAULT_TTL$1 as D,
  ENABLE_PAGINATION as E,
  LoadingSpinner as L,
  SiteNav as S,
  ETH_TO_EUR_RATE as a,
  clearAllCaches as c,
  db as d,
  fetchAllCards as f,
  useCacheCleanup as u
};
