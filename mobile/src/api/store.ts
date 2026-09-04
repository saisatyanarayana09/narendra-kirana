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

export const storeApi = {
  getSettings: async (): Promise<StoreSettings> => {
    const res = await apiClient.get('/store/settings/');
    return Array.isArray(res.data) ? res.data[0] : res.data;
  },
};
