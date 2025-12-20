import { LRUCache } from "lru-cache";
import crypto from "crypto";

interface CachedModelOutput {
  output: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  totalCost: number;
  timestamp: number;
  cached: boolean;
}

// LRU Cache configuration
// - Max 100 entries (prevents unlimited memory growth)
// - TTL: 1 hour (cached responses expire after 1 hour)
// - Update age on access (sliding window)
const cache = new LRUCache<string, CachedModelOutput>({
  max: 100, // Maximum number of cached responses
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true, // Refresh TTL on cache hit
  allowStale: false, // Don't return stale entries
});

/**
 * Generate a cache key from prompt and model ID
 * Uses SHA-256 hash to create a unique, consistent key
 */
export function generateCacheKey(prompt: string, modelId: string): string {
  const content = `${modelId}:${prompt}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Get a cached response for a prompt + model combination
 */
export function getCachedResponse(
  prompt: string,
  modelId: string
): CachedModelOutput | undefined {
  const key = generateCacheKey(prompt, modelId);
  return cache.get(key);
}

/**
 * Store a model response in the cache
 */
export function setCachedResponse(
  prompt: string,
  modelId: string,
  response: Omit<CachedModelOutput, "cached">
): void {
  const key = generateCacheKey(prompt, modelId);
  cache.set(key, {
    ...response,
    cached: true,
  });
}

/**
 * Clear all cached responses
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    max: cache.max,
    calculatedSize: cache.calculatedSize,
  };
}
