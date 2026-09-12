import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'sk_orders_cache';

// In-memory cache for instantaneous synchronous access (<50ms / 0ms)
let memoryCache: any[] | null = null;
let loadPromise: Promise<any[] | null> | null = null;

/**
 * Load cached orders. Returns in-memory cache instantly if available,
 * otherwise reads from AsyncStorage (once) and hydrates in-memory cache.
 */
export async function loadCachedOrders(): Promise<any[] | null> {
  if (memoryCache) return memoryCache;

  // Deduplicate concurrent loads
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[ordersCache] Failed to load cache:', err);
    }
    return null;
  })();

  const result = await loadPromise;
  loadPromise = null;
  return result;
}

/**
 * Get cached orders synchronously (returns null if not yet loaded from disk).
 */
export function getCachedOrdersSync(): any[] | null {
  return memoryCache;
}

/**
 * Persist orders to AsyncStorage and update in-memory cache.
 * Called after a successful network fetch.
 */
export async function saveCachedOrders(orders: any[]): Promise<void> {
  if (!Array.isArray(orders)) return;
  memoryCache = orders;

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn('[ordersCache] Failed to save cache:', err);
  }
}

/**
 * Clear cached orders (e.g. on logout or manual cache bust).
 */
export async function clearCachedOrders(): Promise<void> {
  memoryCache = null;
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
}

// Pre-warm cache on module import
loadCachedOrders().catch(() => {});
