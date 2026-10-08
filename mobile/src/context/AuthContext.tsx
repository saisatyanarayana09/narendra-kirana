import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { DeviceEventEmitter, Platform } from "react-native";

import { apiClient } from "../api/client";
import { STORAGE_KEYS } from "../constants/config";
import { favoritesService } from "../services/favoritesService";
import { clearHomeDataCache } from "../services/homeDataCache";
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from "../services/notificationService";
import { clearCachedOrders } from "../services/ordersCache";
import { clearUserProfileCache } from "../services/profileCache";
import { GoogleSignin } from "../utils/GoogleSigninWrapper";
import { getItem, getItemSync, saveItem, deleteItem } from "../utils/storage";
import { resetWelcomeSession } from "../utils/welcomeSession";

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  customer_profile?: {
    dob?: string;
    referral_code?: string;
    delete_requested?: boolean;
    [key: string]: any;
  };
  referral_code?: string;
  [key: string]: any;
};

export type PendingRedirect = {
  screen: string;
  tab?: string;
  params?: any;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  pendingRedirect: PendingRedirect | null;
  setPendingRedirect: (redirect: PendingRedirect | null) => void;
  clearPendingRedirect: () => void;
  loginWithGoogle: (
    idToken: string,
    referralCode?: string,
    tokenType?: string,
    mobileNumber?: string,
  ) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// Try to read user from memoryStore synchronously (populated by preloadKeys)
function tryGetSyncUser(): User | null {
  try {
    const raw = getItemSync(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // If preloadKeys has already populated memoryStore, we get user instantly
  // and skip the isLoading=true state entirely
  const syncUser = tryGetSyncUser();
  const [user, setUser] = useState<User | null>(syncUser);
  const [isLoading, setIsLoading] = useState(!syncUser); // Only show loading if sync init failed
  const [pendingRedirect, setPendingRedirect] =
    useState<PendingRedirect | null>(null);
  const isLoggingOutRef = useRef(false);

  const clearPendingRedirect = useCallback(() => setPendingRedirect(null), []);

  const loadStoredUser = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    try {
      const storedUser = await getItem(STORAGE_KEYS.USER);
      if (storedUser && !isLoggingOutRef.current) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        registerForPushNotificationsAsync().catch(() => {});
      }
    } catch (error) {
      console.error("Failed to load user", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we already initialized user synchronously, still run the async path
    // to ensure push notifications are registered and storage is confirmed
    if (syncUser) {
      registerForPushNotificationsAsync().catch(() => {});
    }
    loadStoredUser();

    const sub = DeviceEventEmitter.addListener("AUTH_FAILED", () => {
      setUser(null);
    });

    return () => sub.remove();
  }, [loadStoredUser]);

  const login = useCallback(async (data: any) => {
    isLoggingOutRef.current = false;
    try {
      const response = await apiClient.post("/auth/login/", data);

      if (!response.data) throw new Error("Invalid response from server");

      const { access, refresh, user: loggedUser } = response.data;

      await saveItem(STORAGE_KEYS.TOKEN, access);
      await saveItem(STORAGE_KEYS.REFRESH, refresh);
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser));

      resetWelcomeSession();
      setUser(loggedUser);
      registerForPushNotificationsAsync().catch(() => {});
    } catch (error) {
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(
    async (
      idToken: string,
      referralCode?: string,
      tokenType: string = "id_token",
      mobileNumber?: string,
    ) => {
      isLoggingOutRef.current = false;
      try {
        const payload: any = {
          credential: idToken,
          token_type: tokenType,
        };
        if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
          payload.referral_code = referralCode.trim().toUpperCase();
        }
        if (mobileNumber && typeof mobileNumber === "string" && mobileNumber.trim()) {
          payload.mobile_number = mobileNumber.trim();
        }

        const response = await apiClient.post("/auth/google/customer/", payload);

        if (!response || !response.data) {
          throw new Error("Invalid response from server");
        }

        if (response.data?.requires_mobile) {
          return response.data;
        }

        const { access, refresh, user: userData } = response.data;

        await saveItem(STORAGE_KEYS.TOKEN, access);
        await saveItem(STORAGE_KEYS.REFRESH, refresh);
        await saveItem(STORAGE_KEYS.USER, JSON.stringify(userData));

        setUser(userData);
        registerForPushNotificationsAsync().catch(() => {});
        return response.data;
      } catch (error: any) {
        console.error(
          "Google Login error:",
          error?.response?.data || error.message,
        );
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    isLoggingOutRef.current = true;

    // 1. INSTANT ZERO-LATENCY WIPEOUT (0ms UI freeze)
    setUser(null);
    favoritesService.clear();
    resetWelcomeSession();

    // Instantly wipe memoryStore tokens and initiate storage purge
    const tokenPurgePromise = Promise.allSettled([
      deleteItem(STORAGE_KEYS.TOKEN),
      deleteItem(STORAGE_KEYS.REFRESH),
      deleteItem(STORAGE_KEYS.USER),
    ]);

    // 2. Fire-and-forget backend notification & push unregister (non-blocking)
    unregisterPushNotificationsAsync().catch(() => {});
    getItem(STORAGE_KEYS.REFRESH)
      .then((refreshToken) => {
        if (refreshToken) {
          apiClient
            .post("/auth/logout/", { refresh: refreshToken })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // 3. Fire-and-forget Google sign out
    if (Platform.OS !== "web") {
      try {
        GoogleSignin.signOut().catch(() => {});
      } catch {}
    }

    // 4. Background parallel cache purges (does not block user interaction)
    Promise.allSettled([
      tokenPurgePromise,
      clearHomeDataCache(),
      clearCachedOrders(),
      clearUserProfileCache(),
      (async () => {
        try {
          const { Image } = require("expo-image");
          Image.clearMemoryCache?.();
          await Image.clearDiskCache?.();
        } catch {}
      })(),
      (async () => {
        if (
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          "caches" in window
        ) {
          try {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((k) => caches.delete(k)));
          } catch {}
        }
      })(),
    ]).finally(() => {
      // Keep isLoggingOut locked for a brief window to discard any trailing in-flight network responses
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    });
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    if (isLoggingOutRef.current) return;
    try {
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      if (!isLoggingOutRef.current) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error("Failed to update user locally:", error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    const token =
      getItemSync(STORAGE_KEYS.TOKEN) || (await getItem(STORAGE_KEYS.TOKEN));
    if (!token) return;

    try {
      const response = await apiClient.get("/auth/profile/");
      if (isLoggingOutRef.current) return;
      if (response.data) {
        await saveItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
        if (!isLoggingOutRef.current) {
          setUser(response.data);
        }
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error("Failed to refresh user profile:", error);
      }
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      pendingRedirect,
      setPendingRedirect,
      clearPendingRedirect,
      login,
      loginWithGoogle,
      logout,
      updateUser,
      refreshUser,
    }),
    [
      user,
      isLoading,
      pendingRedirect,
      clearPendingRedirect,
      login,
      loginWithGoogle,
      logout,
      updateUser,
      refreshUser,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
