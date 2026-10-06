import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "../constants/config";
import { getItemSync } from "../utils/storage";

const getCacheKey = () => {
  try {
    const userRaw = getItemSync(STORAGE_KEYS.USER);
    if (userRaw) {
      const user = typeof userRaw === "string" ? JSON.parse(userRaw) : userRaw;
      if (user?.id) return `sk_orders_cache_${user.id}`;
    }
  } catch {}
  return "sk_orders_cache";
};

// In-memory cache for instantaneous synchronous access (<50ms / 0ms)
let memoryCache: any[] | null = null;
let memoryCacheUserId: string | number | null = null;
let loadPromise: Promise<any[] | null> | null = null;

/**
 * Load cached orders. Returns in-memory cache instantly if available,
 * otherwise reads from AsyncStorage (once) and hydrates in-memory cache.
 */
export async function loadCachedOrders(): Promise<any[] | null> {
  const cacheKey = getCacheKey();
  if (memoryCache && memoryCacheUserId === cacheKey) return memoryCache;

  // Deduplicate concurrent loads
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache = parsed;
          memoryCacheUserId = cacheKey;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[ordersCache] Failed to load cache:", err);
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
 * Find a single order from in-memory cache synchronously (<1ms).
 */
export function getCachedOrderByIdSync(orderId: number | string): any | null {
  if (!memoryCache || !orderId) return null;
  return memoryCache.find((o) => String(o.id) === String(orderId)) || null;
}

/**
 * Update or insert a single order into cache.
 */
export async function saveCachedSingleOrder(order: any): Promise<void> {
  if (!order || !order.id) return;
  const cacheKey = getCacheKey();
  if (!memoryCache) memoryCache = [];
  memoryCacheUserId = cacheKey;
  const idx = memoryCache.findIndex((o) => String(o.id) === String(order.id));
  if (idx >= 0) {
    memoryCache[idx] = { ...memoryCache[idx], ...order };
  } else {
    memoryCache.unshift(order);
  }
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(memoryCache));
  } catch {}
}

/**
 * Persist orders to AsyncStorage and update in-memory cache.
 * Called after a successful network fetch.
 */
export async function saveCachedOrders(orders: any[]): Promise<void> {
  if (!Array.isArray(orders)) return;
  const cacheKey = getCacheKey();
  memoryCache = orders;
  memoryCacheUserId = cacheKey;

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(orders));
  } catch (err) {
    console.warn("[ordersCache] Failed to save cache:", err);
  }
}

/**
 * Clear cached orders (e.g. on logout or manual cache bust).
 */
export async function clearCachedOrders(): Promise<void> {
  const cacheKey = getCacheKey();
  memoryCache = null;
  memoryCacheUserId = null;
  try {
    await AsyncStorage.removeItem(cacheKey);
    await AsyncStorage.removeItem("sk_orders_cache");
  } catch {}
}

// Pre-warm cache on module import
loadCachedOrders().catch(() => {});
