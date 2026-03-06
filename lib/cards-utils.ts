import { ACTIVE_LEAGUES, SHOW_ONLY_ACTIVE_LEAGUES } from "@/lib/config";
import type { UnifiedCard } from "@/lib/kv-types";
import type { CardData } from "@/lib/sorare-api";

// Supporta sia CardData (Sorare) che UnifiedCard (KV)
type Card = CardData | UnifiedCard;

/**
 * Filter types for cards dashboard
 */
export type RarityFilter = "all" | "limited" | "rare";
export type PositionFilter =
  | "all"
  | "Goalkeeper"
  | "Defender"
  | "Midfielder"
  | "Forward";
export type SealedFilter = "unsealed" | "sealed" | "all";
export type SortOption = "name" | "team" | "aa15" | "l5" | "l10" | "l15" | "l40";

export interface LeagueOption {
  value: string;
  label: string;
}

/**
 * Format a date as relative time (e.g., "5m ago", "2h ago")
 */
export function formatLastUpdate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}

/**
 * Get Italian label for a position
 */
export function getPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    Goalkeeper: "POR",
    Defender: "DIF",
    Midfielder: "CEN",
    Forward: "ATT",
  };
  return labels[position] ?? position;
}

/**
 * Extract unique domestic leagues from cards
 */
export function extractLeagues(cards: Card[]): LeagueOption[] {
  const leagueMap = new Map<string, string>();

  for (const card of cards) {
    const competitions = card.anyPlayer?.activeClub?.activeCompetitions ?? [];
    for (const competition of competitions) {
      if (competition.format !== "DOMESTIC_LEAGUE" || !competition.country) {
        continue;
      }

      const uniqueKey = `${competition.name}|${competition.country.code}`;
      const isAllowed =
        !SHOW_ONLY_ACTIVE_LEAGUES || Object.hasOwn(ACTIVE_LEAGUES, uniqueKey);

      if (isAllowed && !leagueMap.has(uniqueKey)) {
        const displayName = ACTIVE_LEAGUES[uniqueKey] ?? uniqueKey;
        leagueMap.set(uniqueKey, displayName);
      }
    }
  }

  return Array.from(leagueMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Filter cards by rarity
 */
function filterByRarity(cards: Card[], rarity: RarityFilter): Card[] {
  if (rarity === "all") {
    return cards;
  }
  return cards.filter((card) => card.rarityTyped.toLowerCase() === rarity);
}

/**
 * Filter cards by position
 */
function filterByPosition(cards: Card[], position: PositionFilter): Card[] {
  if (position === "all") {
    return cards;
  }
  return cards.filter((card) => card.anyPositions?.includes(position));
}

/**
 * Filter cards by league
 */
function filterByLeague(cards: Card[], leagueFilter: string): Card[] {
  if (leagueFilter === "all") {
    return cards;
  }

  const [leagueName, countryCode] = leagueFilter.split("|");
  return cards.filter((card) =>
    card.anyPlayer?.activeClub?.activeCompetitions?.some(
      (c) =>
        c.format === "DOMESTIC_LEAGUE" &&
        c.name === leagueName &&
        c.country?.code === countryCode
    )
  );
}

/**
 * Filter cards by in-season eligibility
 */
function filterByInSeason(cards: Card[], inSeasonOnly: boolean): Card[] {
  if (!inSeasonOnly) {
    return cards;
  }
  return cards.filter((card) => card.inSeasonEligible === true);
}

/**
 * Filter cards by sealed status
 */
function filterBySealed(cards: Card[], sealed: SealedFilter): Card[] {
  if (sealed === "all") {
    return cards;
  }
  return cards.filter((card) => card.sealed === (sealed === "sealed"));
}

/**
 * Filter cards by search query (name and team)
 */
function filterBySearch(cards: Card[], searchQuery: string): Card[] {
  if (!searchQuery.trim()) {
    return cards;
  }

  const query = searchQuery.toLowerCase().trim();
  return cards.filter(
    (card) =>
      card.name.toLowerCase().includes(query) ||
      card.anyPlayer?.activeClub?.name?.toLowerCase().includes(query)
  );
}

/**
 * Sort cards by the specified option
 */
function sortCards(cards: Card[], sortBy: SortOption): Card[] {
  return [...cards].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "team":
        return (a.anyPlayer?.activeClub?.name ?? "").localeCompare(
          b.anyPlayer?.activeClub?.name ?? ""
        );
      case "l5":
        return (b.l5Average ?? 0) - (a.l5Average ?? 0);
      case "l10":
        return (b.l10Average ?? 0) - (a.l10Average ?? 0);
      case "l15":
        return (b.l15Average ?? 0) - (a.l15Average ?? 0);
      case "l40":
        return (b.l40Average ?? 0) - (a.l40Average ?? 0);
      case "aa15": {
        const aa15A = (a as UnifiedCard).playerStats?.aaAnalysis?.AA15 ?? 0;
        const aa15B = (b as UnifiedCard).playerStats?.aaAnalysis?.AA15 ?? 0;
        return aa15B - aa15A;
      }
      default:
        return 0;
    }
  });
}

export interface CardFilters {
  rarity: RarityFilter;
  position: PositionFilter;
  league: string;
  sortBy: SortOption;
  inSeasonOnly: boolean;
  sealed: SealedFilter;
  searchQuery: string;
}

/**
 * Apply all filters and sorting to cards
 */
export function filterAndSortCards(
  cards: Card[],
  filters: CardFilters
): Card[] {
  let result = filterByRarity(cards, filters.rarity);
  result = filterByPosition(result, filters.position);
  result = filterByLeague(result, filters.league);
  result = filterByInSeason(result, filters.inSeasonOnly);
  result = filterBySealed(result, filters.sealed);
  result = filterBySearch(result, filters.searchQuery);
  return sortCards(result, filters.sortBy);
}
