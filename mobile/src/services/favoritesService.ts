import { apiClient } from '../api/client';

export interface FavoriteItem {
  id: number;
  product?: any;
  product_details?: any;
  created_at?: string;
  [key: string]: any;
}

export interface FavoritesSnapshot {
  items: FavoriteItem[];
  ids: Set<number>;
  map: Record<number, number>;
}

type Listener = () => void;

class FavoritesService {
  private items: FavoriteItem[] = [];
  private favoriteIds: Set<number> = new Set();
  private favoriteMap: Record<number, number> = {};
  private lastFetched: number = 0;
  private fetchPromise: Promise<FavoritesSnapshot> | null = null;
  private listeners: Set<Listener> = new Set();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60s memory TTL

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error('[FavoritesService] Listener error:', e);
      }
    });
  }

  getSnapshot(): FavoritesSnapshot {
    return {
      items: this.items,
      ids: this.favoriteIds,
      map: this.favoriteMap,
    };
  }

  getFavoriteIds(): Set<number> {
    return this.favoriteIds;
  }

  getFavoriteMap(): Record<number, number> {
    return this.favoriteMap;
  }

  getItems(): FavoriteItem[] {
    return this.items;
  }

  isFavorite(productId: number): boolean {
    return this.favoriteIds.has(productId);
  }

  getFavoriteId(productId: number): number | undefined {
    return this.favoriteMap[productId];
  }

  hasCachedData(): boolean {
    return this.lastFetched > 0;
  }

  async getFavorites(force = false): Promise<FavoritesSnapshot> {
    const isFresh = Date.now() - this.lastFetched < this.CACHE_TTL_MS;
    if (!force && this.lastFetched > 0 && isFresh) {
      return this.getSnapshot();
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const res = await apiClient.get('/favorites/').catch(() => ({ data: [] }));
        const rawItems: FavoriteItem[] = Array.isArray(res.data) ? res.data : (res.data?.results || []);

        const ids = new Set<number>();
        const map: Record<number, number> = {};

        rawItems.forEach(item => {
          const pId = item.product?.id ?? item.product ?? item.product_details?.id;
          if (pId) {
            const numId = Number(pId);
            ids.add(numId);
            map[numId] = item.id;
          }
        });

        this.items = rawItems;
        this.favoriteIds = ids;
        this.favoriteMap = map;
        this.lastFetched = Date.now();
        this.notify();

        return this.getSnapshot();
      } catch (err) {
        console.warn('[FavoritesService] Error loading favorites:', err);
        return this.getSnapshot();
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  async toggleFavorite(productId: number, productDetails?: any): Promise<boolean> {
    const isFav = this.favoriteIds.has(productId);
    const favId = this.favoriteMap[productId];

    // Optimistic UI updates
    const nextIds = new Set(this.favoriteIds);
    const nextMap = { ...this.favoriteMap };

    if (isFav) {
      nextIds.delete(productId);
      delete nextMap[productId];
      this.items = this.items.filter(item => {
        const pId = Number(item.product?.id ?? item.product ?? item.product_details?.id);
        return pId !== productId && item.id !== favId;
      });
    } else {
      nextIds.add(productId);
      const tempId = favId || Date.now();
      nextMap[productId] = tempId;
      this.items = [
        {
          id: tempId,
          product: productDetails || { id: productId },
          product_details: productDetails,
        },
        ...this.items,
      ];
    }

    this.favoriteIds = nextIds;
    this.favoriteMap = nextMap;
    this.notify();

    try {
      if (isFav) {
        if (favId) {
          await apiClient.delete(`/favorites/${favId}/`).catch(() =>
            apiClient.post('/favorites/toggle/', { product: productId })
          );
        } else {
          await apiClient.post('/favorites/toggle/', { product: productId });
        }
        return false;
      } else {
        const res = await apiClient.post('/favorites/', { product: productId });
        const newId = res.data?.id || res.data?.favorite?.id;
        if (newId) {
          this.favoriteMap[productId] = newId;
          const found = this.items.find(i => {
            const id = Number(i.product?.id ?? i.product ?? i.product_details?.id);
            return id === productId;
          });
          if (found) {
            found.id = newId;
          }
          this.notify();
        }
        return true;
      }
    } catch (error) {
      // Rollback on network failure
      if (isFav) {
        this.favoriteIds.add(productId);
        if (favId) this.favoriteMap[productId] = favId;
      } else {
        this.favoriteIds.delete(productId);
        delete this.favoriteMap[productId];
      }
      this.notify();
      throw error;
    }
  }

  clear() {
    this.items = [];
    this.favoriteIds = new Set();
    this.favoriteMap = {};
    this.lastFetched = 0;
    this.notify();
  }
}

export const favoritesService = new FavoritesService();
