import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "sk_home_cache";

export interface CachedHomeData {
  categories: any[];
  banners: any[];
  sections: any[];
  settings: any;
  timestamp: number;
}

// In-memory cache for synchronous access after first load
let memoryCache: CachedHomeData | null = null;
let loadPromise: Promise<CachedHomeData | null> | null = null;

/**
 * Load cached home data. Returns in-memory cache instantly if available,
 * otherwise reads from AsyncStorage (once).
 */
export async function loadHomeData(): Promise<CachedHomeData | null> {
  if (memoryCache) return memoryCache;

  // Deduplicate concurrent loads
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: CachedHomeData = JSON.parse(raw);
        // Only use cache if it has actual data
        if (parsed.categories?.length > 0 || parsed.sections?.length > 0) {
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[homeDataCache] Failed to load cache:", err);
    }
    return null;
  })();

  const result = await loadPromise;
  loadPromise = null;
  return result;
}

/**
 * Get cached data synchronously (returns null if not yet loaded from disk).
 */
export function getHomeDataSync(): CachedHomeData | null {
  return memoryCache;
}

/**
 * Persist home data to AsyncStorage and update in-memory cache.
 * Called after a successful network fetch.
 */
export async function saveHomeData(
  data: Omit<CachedHomeData, "timestamp">,
): Promise<void> {
  const cacheEntry: CachedHomeData = {
    ...data,
    timestamp: Date.now(),
  };
  memoryCache = cacheEntry;

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (err) {
    console.warn("[homeDataCache] Failed to save cache:", err);
  }
}

/**
 * Clear cache (e.g. on logout or manual cache bust).
 */
export async function clearHomeDataCache(): Promise<void> {
  memoryCache = null;
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
}

// Pre-warm cache on module import
loadHomeData().catch(() => {});
