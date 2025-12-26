interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

interface GraphQLRequest<V = unknown> {
  query: string;
  variables?: V;
}

const CACHE_NAME = "sorare-graphql-cache";
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 ore

export class GraphQLCache {
  private cache: Cache | null = null;

  async init(): Promise<void> {
    if (this.cache) {
      return;
    }

    try {
      this.cache = await caches.open(CACHE_NAME);
    } catch {
      // Cache API not available (e.g., non-secure context)
      console.warn("Cache API not available");
    }
  }

  private generateKey(request: GraphQLRequest): string {
    const key = JSON.stringify({
      query: request.query,
      variables: request.variables,
    });
    return `/graphql/${btoa(key)}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (!entry.ttl) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }

  async get<V, T>(request: GraphQLRequest<V>): Promise<T | null> {
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

      const entry: CacheEntry<T> = await response.json();

      if (this.isExpired(entry)) {
        await this.cache.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async set<V, T>(
    request: GraphQLRequest<V>,
    data: T,
    ttl = DEFAULT_TTL
  ): Promise<void> {
    await this.init();

    if (!this.cache) {
      return;
    }

    try {
      const key = this.generateKey(request);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      const response = Response.json(entry);

      await this.cache.put(key, response);
    } catch {
      // Silently fail if cache is full or not available
    }
  }

  async invalidate(request?: GraphQLRequest): Promise<void> {
    await this.init();

    if (!this.cache) {
      return;
    }

    if (request) {
      const key = this.generateKey(request);
      await this.cache?.delete(key);
    } else {
      const keys = await this.cache.keys();
      await Promise.all(keys.map((key) => this.cache.delete(key)));
    }
  }

  async clear(): Promise<void> {
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

  async getSize(): Promise<number> {
    await this.init();

    if (!this.cache) {
      return 0;
    }

    const keys = await this.cache.keys();
    return keys.length;
  }
}

export const graphqlCache = new GraphQLCache();

export async function cachedFetch<V, T>(
  request: GraphQLRequest<V>,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = await graphqlCache.get<V, T>(request);

  if (cached) {
    return cached;
  }

  const data = await fetcher();
  await graphqlCache.set(request, data, ttl);

  return data;
}
