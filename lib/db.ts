import { Dexie, type Table } from "dexie";
import type { CardData } from "./sorare-api";

export interface CachedCards {
  slug?: string;
  userSlug: string;
  cards: CardData[];
  timestamp: number;
  rarityFilter?: string;
}

export interface CacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  ttl?: number;
}

export interface SavedFormation {
  id?: number;
  name: string;
  league: string; // "leagueName|countryCode"
  cards: CardData[];
  slots: Array<{ position: string; cardSlug: string }>;
  createdAt: number;
}

export class SorareDB extends Dexie {
  cachedCards!: Table<CachedCards>;

  cache!: Table<CacheEntry>;

  savedFormations!: Table<SavedFormation>;

  constructor() {
    super("SorareDB");

    this.version(2).stores({
      cachedCards: "slug, userSlug, timestamp, rarityFilter",
      cache: "key, timestamp",
      savedFormations: "++id, league, createdAt",
    });
  }
}

export const db = new SorareDB();

export const CACHE_KEYS = {
  ALL_CARDS: "all_cards",
  USER_CARDS: (userSlug: string) => `user_cards_${userSlug}`,
} as const;

export const DEFAULT_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minuti
  MEDIUM: 30 * 60 * 1000, // 30 minuti
  LONG: 24 * 60 * 60 * 1000, // 24 ore
  VERY_LONG: 7 * 24 * 60 * 60 * 1000, // 7 giorni
} as const;

export async function getCache<T>(key: string): Promise<T | null> {
  const entry = await db.cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
    await db.cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function setCache(
  key: string,
  value: unknown,
  ttl = DEFAULT_TTL.LONG
): Promise<void> {
  await db.cache.put({
    key,
    value,
    timestamp: Date.now(),
    ttl,
  });
}

export async function invalidateCache(pattern?: string): Promise<void> {
  if (pattern) {
    const keys = await db.cache.toCollection().primaryKeys();
    const matchingKeys = keys.filter(
      (k) => typeof k === "string" && k.includes(pattern)
    );
    await db.cache.bulkDelete(matchingKeys);
  } else {
    await db.cache.clear();
  }
}

export async function cleanupExpiredCache(): Promise<void> {
  const now = Date.now();
  const expiredKeys: string[] = [];

  await db.cache.toCollection().each((entry) => {
    if (entry.ttl && now - entry.timestamp > entry.ttl) {
      expiredKeys.push(entry.key);
    }
  });

  if (expiredKeys.length > 0) {
    await db.cache.bulkDelete(expiredKeys);
  }
}
