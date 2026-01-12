/**
 * Whether to enable pagination when fetching cards from Sorare API.
 * Set to false to fetch only the first page (100 cards).
 */
export const ENABLE_PAGINATION = true;

/**
 * Whether to show only the leagues listed in ACTIVE_LEAGUES.
 * - false: Show all leagues found in user's cards
 * - true: Show only leagues configured in ACTIVE_LEAGUES
 */
export const SHOW_ONLY_ACTIVE_LEAGUES = true;

/**
 * Configuration of leagues to display in the filter dropdown.
 *
 * Key format: "leagueName|countryCode" (e.g., "Serie A|IT", "Bundesliga|DE")
 * - leagueName: The exact name returned by Sorare API
 * - countryCode: ISO 3166-1 alpha-2 country code (IT, GB, DE, AT, ES, FR, etc.)
 *
 * Value: Custom display name shown in the UI (or use the key as fallback)
 *
 * Usage:
 * 1. Set SHOW_ONLY_ACTIVE_LEAGUES to true to filter only these leagues
 * 2. Add entries for each league you want to include
 * 3. Use unique keys to distinguish leagues with the same name (e.g., Bundesliga)
 *
 * Examples:
 * - "Serie A|IT": "Serie A"           → Serie A (Italy)
 * - "Bundesliga|DE": "Bundesliga"     → Bundesliga (Germany)
 * - "Bundesliga|AT": "Bundesliga AT"  → Bundesliga (Austria)
 */
export const ACTIVE_LEAGUES: Record<string, string> = {
  "Serie A|it": "Serie A",
  "Premier League|gb-eng": "Premier League",
  "Primera División|es": "La Liga",
  "Bundesliga|de": "Bundesliga",
  "Bundesliga|at": "Bundesliga Austria",
  "Ligue 1|fr": "Ligue 1",
  "First Division A|be": "Jupiler Pro League",
  "MLS|us": "MLS",
  "Eredivisie|nl": "Eredivisie",
  "Liga Portugal|pt": "Liga Portugal",
};

/**
 * Exchange rate from ETH to EUR for converting wei-based prices.
 * Update this value periodically to reflect current market rates.
 */
export const ETH_TO_EUR_RATE = 2653;
