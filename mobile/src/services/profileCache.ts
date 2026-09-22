import AsyncStorage from "@react-native-async-storage/async-storage";

// In-memory caches for instantaneous synchronous access (<10ms / 0ms)
const memoryWallet = new Map<string, any>();
const memoryAddresses = new Map<string, any[]>();
const memoryNotifications = new Map<string, any[]>();
const memoryReferrals = new Map<string, any>();

// In-flight disk load promises to deduplicate concurrent reads
const pendingLoads = new Map<string, Promise<any>>();

// --- WALLET ---
export function getCachedWalletSync(
  userId?: number | string | null,
): any | null {
  if (!userId) return null;
  return memoryWallet.get(String(userId)) || null;
}

export async function loadCachedWallet(
  userId?: number | string | null,
): Promise<any | null> {
  if (!userId) return null;
  const uid = String(userId);
  if (memoryWallet.has(uid)) return memoryWallet.get(uid);

  const key = `sk_wallet_${uid}`;
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const p = (async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          memoryWallet.set(uid, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[ProfileCache] Load failed:", e);
    }
    return null;
  })().finally(() => pendingLoads.delete(key));

  pendingLoads.set(key, p);
  return p;
}

export async function saveCachedWallet(
  userId: number | string,
  data: any,
): Promise<void> {
  if (!userId || !data) return;
  const uid = String(userId);
  memoryWallet.set(uid, data);
  await AsyncStorage.setItem(`sk_wallet_${uid}`, JSON.stringify(data)).catch(
    (e) => console.warn("[ProfileCache] Save wallet failed:", e),
  );
}

// --- ADDRESSES ---
export function getCachedAddressesSync(
  userId?: number | string | null,
): any[] | null {
  if (!userId) return null;
  return memoryAddresses.get(String(userId)) || null;
}

export async function loadCachedAddresses(
  userId?: number | string | null,
): Promise<any[] | null> {
  if (!userId) return null;
  const uid = String(userId);
  if (memoryAddresses.has(uid)) return memoryAddresses.get(uid) || null;

  const key = `sk_addresses_${uid}`;
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const p = (async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryAddresses.set(uid, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[ProfileCache] Load failed:", e);
    }
    return null;
  })().finally(() => pendingLoads.delete(key));

  pendingLoads.set(key, p);
  return p;
}

export async function saveCachedAddresses(
  userId: number | string,
  data: any[],
): Promise<void> {
  if (!userId || !Array.isArray(data)) return;
  const uid = String(userId);
  memoryAddresses.set(uid, data);
  await AsyncStorage.setItem(`sk_addresses_${uid}`, JSON.stringify(data)).catch(
    (e) => console.warn("[ProfileCache] Save addresses failed:", e),
  );
}

// --- NOTIFICATIONS ---
export function getCachedNotificationsSync(
  userId?: number | string | null,
): any[] | null {
  if (!userId) return null;
  return memoryNotifications.get(String(userId)) || null;
}

export async function loadCachedNotifications(
  userId?: number | string | null,
): Promise<any[] | null> {
  if (!userId) return null;
  const uid = String(userId);
  if (memoryNotifications.has(uid)) return memoryNotifications.get(uid) || null;

  const key = `sk_notifs_${uid}`;
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const p = (async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryNotifications.set(uid, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[ProfileCache] Load failed:", e);
    }
    return null;
  })().finally(() => pendingLoads.delete(key));

  pendingLoads.set(key, p);
  return p;
}

export async function saveCachedNotifications(
  userId: number | string,
  data: any[],
): Promise<void> {
  if (!userId || !Array.isArray(data)) return;
  const uid = String(userId);
  memoryNotifications.set(uid, data);
  AsyncStorage.setItem(`sk_notifs_${uid}`, JSON.stringify(data)).catch(
    () => {},
  );
}

// --- REFERRALS & EARN ---
export function getCachedReferralsSync(
  userId?: number | string | null,
): any | null {
  if (!userId) return null;
  return memoryReferrals.get(String(userId)) || null;
}

export async function loadCachedReferrals(
  userId?: number | string | null,
): Promise<any | null> {
  if (!userId) return null;
  const uid = String(userId);
  if (memoryReferrals.has(uid)) return memoryReferrals.get(uid) || null;

  const key = `sk_referrals_${uid}`;
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const p = (async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          memoryReferrals.set(uid, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[ProfileCache] Load failed:", e);
    }
    return null;
  })().finally(() => pendingLoads.delete(key));

  pendingLoads.set(key, p);
  return p;
}

export async function saveCachedReferrals(
  userId: number | string,
  data: any,
): Promise<void> {
  if (!userId || !data) return;
  const uid = String(userId);
  memoryReferrals.set(uid, data);
  await AsyncStorage.setItem(`sk_referrals_${uid}`, JSON.stringify(data)).catch(
    (e) => console.warn("[ProfileCache] Save referrals failed:", e),
  );
}

// --- CLEAR ALL USER PROFILE CACHES (ON LOGOUT) ---
export async function clearUserProfileCache(): Promise<void> {
  memoryWallet.clear();
  memoryAddresses.clear();
  memoryNotifications.clear();
  memoryReferrals.clear();
  pendingLoads.clear();

  try {
    const keys = await AsyncStorage.getAllKeys();
    const profileKeys = keys.filter(
      (k) =>
        k.startsWith("sk_wallet_") ||
        k.startsWith("sk_addresses_") ||
        k.startsWith("sk_notifs_") ||
        k.startsWith("sk_referrals_"),
    );
    if (profileKeys.length > 0) {
      await AsyncStorage.multiRemove(profileKeys);
    }
  } catch (e) {
    console.warn("[ProfileCache] Load failed:", e);
  }
}
