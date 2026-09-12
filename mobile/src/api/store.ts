import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';
import { apiClient } from './client';

export interface StoreSettings {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_email?: string;
  is_open?: boolean;
  min_order_amount?: string | number;
  packaging_fee?: string | number;
  low_stock_threshold?: number;
  delivery_mode?: string;
  is_home_delivery_active?: boolean;
  delivery_fee?: string | number;
  free_delivery_threshold?: string | number;
  min_delivery_order_amount?: string | number;
  allowed_pincodes?: string;
  invoice_signature?: string;

  // UPI
  upi_id?: string;
  upi_payee_name?: string;
  upi_qr_image?: string;
  enable_dynamic_upi_qr?: boolean;

  // Compliance
  fssai_license_number?: string;
  gstin?: string;
  enable_itemized_tax_invoice?: boolean;
  invoice_terms_and_conditions?: string;

  // Store Timings & Emergency Pause
  store_timings_json?: Record<string, any>;
  auto_cutoff_orders?: boolean;
  is_emergency_paused?: boolean;
  emergency_pause_message?: string;

  // Delivery & Pickup Time Slots
  enable_time_slots?: boolean;
  preparation_buffer_minutes?: number;
  max_orders_per_slot?: number;
  time_slots_json?: Array<{ start?: string; end?: string; label?: string }> | string;

  // WhatsApp Support
  enable_whatsapp_support?: boolean;
  whatsapp_number?: string;
  whatsapp_default_message?: string;
  whatsapp_order_help_template?: string;

  // Loyalty Wallet & Referral Rules
  referral_bonus_referrer?: string | number;
  referral_bonus_referee?: string | number;
  referral_min_order_amount?: string | number;
  max_wallet_usage_percentage?: number;
  order_cashback_percentage?: string | number;

  // Announcement Marquee & Festive Popup
  enable_announcement_bar?: boolean;
  announcement_text?: string;
  announcement_bg_color?: string;
  announcement_text_color?: string;
  announcement_start_date?: string;
  announcement_end_date?: string;
  enable_festive_popup?: boolean;
  festive_popup_title?: string;
  festive_popup_content?: string;
  festive_popup_image?: string;

  // Mobile Version & Maintenance
  min_mobile_version?: string;
  latest_mobile_version?: string;
  force_app_update?: boolean;
  app_update_url?: string;
  app_update_message?: string;
  is_maintenance_mode?: boolean;
  maintenance_message?: string;
  maintenance_estimated_end?: string;
}

const SETTINGS_CACHE_KEY = 'sk_store_settings_cache';
let cachedSettings: StoreSettings | null = null;
let cacheExpiry = 0;
let inFlightSettingsPromise: Promise<StoreSettings> | null = null;
let diskCacheLoaded = false;

// Load persisted settings from AsyncStorage at module init (non-blocking)
let diskLoadPromise: Promise<void> | null = null;

function loadDiskCache(): Promise<void> {
  if (diskCacheLoaded) return Promise.resolve();
  if (diskLoadPromise) return diskLoadPromise;

  diskLoadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_CACHE_KEY);
      if (raw && !cachedSettings) {
        cachedSettings = JSON.parse(raw);
        // Give disk cache a 5-minute expiry so we don't serve very stale data
        cacheExpiry = Date.now() + 300000;
      }
    } catch {}
    diskCacheLoaded = true;
  })();
  return diskLoadPromise;
}

// Start loading disk cache immediately at module init
loadDiskCache();

export const storeApi = {
  getSettings: async (forceRefresh = false): Promise<StoreSettings> => {
    const now = Date.now();

    // Return memory cache if fresh
    if (!forceRefresh && cachedSettings && now < cacheExpiry) {
      return cachedSettings;
    }

    // Return in-flight promise to deduplicate concurrent calls
    if (!forceRefresh && inFlightSettingsPromise) {
      return inFlightSettingsPromise;
    }

    // If no memory cache yet, try disk cache first
    if (!cachedSettings && !diskCacheLoaded) {
      await loadDiskCache();
      if (cachedSettings && !forceRefresh && Date.now() < cacheExpiry) {
        // Trigger background refresh but return disk cache immediately
        fetchAndCacheSettings().catch(() => {});
        return cachedSettings;
      }
    }

    return fetchAndCacheSettings();
  },
};

function fetchAndCacheSettings(): Promise<StoreSettings> {
  // Deduplicate: if already fetching, return that promise
  if (inFlightSettingsPromise) return inFlightSettingsPromise;

  inFlightSettingsPromise = (async () => {
    try {
      const res = await apiClient.get('/store/settings/');
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      cachedSettings = data;
      cacheExpiry = Date.now() + 15000; // 15s fresh cache

      // Persist to disk for next cold start (non-blocking)
      AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data)).catch(() => {});

      return data;
    } catch (err: any) {
      // If apiClient failed with 401, fallback to unauthenticated request
      if (err?.response?.status === 401) {
        try {
          const fallbackRes = await axios.get(`${API_BASE_URL}/store/settings/`, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
          });
          const data = Array.isArray(fallbackRes.data) ? fallbackRes.data[0] : fallbackRes.data;
          cachedSettings = data;
          cacheExpiry = Date.now() + 15000;
          AsyncStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data)).catch(() => {});
          return data;
        } catch {
          // Bubble original error if unauthenticated fallback also fails
        }
      }
      // If we have stale cache, return it rather than throwing
      if (cachedSettings) {
        return cachedSettings;
      }
      throw err;
    } finally {
      inFlightSettingsPromise = null;
    }
  })();

  return inFlightSettingsPromise;
}

