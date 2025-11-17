/**
 * Caching layer for performance optimization
 * Uses in-memory cache with TTL support
 * Can be extended to use Redis in production
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL: number;

  constructor(defaultTTL: number = 3600000) { // 1 hour default
    this.defaultTTL = defaultTTL;
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create cache instances for different data types
export const relationshipCache = new InMemoryCache(3600000); // 1 hour TTL for relationships
export const mcpDataCache = new InMemoryCache(1800000); // 30 minutes TTL for MCP data

/**
 * Generate cache key for relationship health score
 */
export function getRelationshipCacheKey(email: string): string {
  return `relationship:${email}`;
}

/**
 * Generate cache key for MCP data
 */
export function getMCPCacheKey(service: string, params: Record<string, unknown>): string {
  const paramStr = JSON.stringify(params);
  return `mcp:${service}:${paramStr}`;
}

/**
 * Cache wrapper for async functions
 */
export async function cached<T>(
  cache: InMemoryCache,
  key: string,
  fn: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function and cache result
  const result = await fn();
  cache.set(key, result, ttlMs);
  return result;
}
