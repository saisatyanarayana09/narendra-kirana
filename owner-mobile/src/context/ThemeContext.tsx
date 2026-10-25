import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import { safeStorage } from '../utils/storage';
import api from '../services/api';

import {
  ThemeMode,
  ThemeColors,
  LIGHT_COLORS,
  DARK_COLORS,
  THEME_PRESETS,
  theme as globalTheme,
  HexColor,
} from '../constants/theme';

export type { ThemeMode, ThemeColors };

export function normalizeHex(hex?: string | null, fallback = '#10b981'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.trim().replace(/[^0-9a-fA-F#]/g, '');
  const withHash = clean.startsWith('#') ? clean : `#${clean}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash) ? withHash : fallback;
}

export function adjustLuminance(hex: string, percent: number): string {
  if (!hex || typeof hex !== 'string') return hex;
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  refreshTheme: (override?: any) => Promise<void>;
}

const THEME_KEY = 'smart-kirana-owner-theme';
const STORE_THEME_KEY = 'smart-kirana-owner-store-theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  colors: LIGHT_COLORS,
  refreshTheme: async () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [storeTheme, setStoreTheme] = useState<{
    applyToOwner?: boolean;
    primary?: string;
    primaryDark?: string;
    secondary?: string;
    accent?: string;
  } | null>(null);

  const parseThemeFromData = useCallback((d: any) => {
    if (!d) return null;
    const applyToOwner = Boolean(d.apply_theme_to_owner_app);
    if (!applyToOwner) {
      return { applyToOwner: false };
    }
    const preset = (THEME_PRESETS as any)[d.brand_theme_preset] || THEME_PRESETS.vacation;
    const isCustom = d.brand_theme_preset === 'custom';
    const primary = normalizeHex(
      isCustom ? d.custom_primary_color : (preset?.primary || d.custom_primary_color || '#5ba8a6'),
      '#5ba8a6'
    );
    const primaryDark = isCustom
      ? adjustLuminance(primary, -15)
      : normalizeHex(preset?.primaryDark, adjustLuminance(primary, -15));
    const secondary = normalizeHex(
      isCustom ? d.custom_secondary_color : (preset?.secondary || d.custom_secondary_color || '#4d69a5'),
      '#4d69a5'
    );
    const accent = normalizeHex(
      isCustom ? d.custom_accent_color : (preset?.accent || d.custom_accent_color || '#ecd386'),
      '#ecd386'
    );

    return {
      applyToOwner: true,
      primary,
      primaryDark,
      secondary,
      accent,
    };
  }, []);

  useEffect(() => {
    safeStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
      }
    });

    safeStorage.getItem(STORE_THEME_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) setStoreTheme(parsed);
        } catch {}
      }
    });
  }, []);

  const loadStoreTheme = useCallback(async (overrideData?: any) => {
    if (overrideData) {
      const parsed = parseThemeFromData(overrideData);
      if (parsed) {
        setStoreTheme(parsed);
        safeStorage.setItem(STORE_THEME_KEY, JSON.stringify(parsed));
      }
      return;
    }
    try {
      const res = await api.get('/store/settings/', { params: { t: Date.now() } });
      const d = res.data;
      if (d) {
        const parsed = parseThemeFromData(d);
        if (parsed) {
          setStoreTheme(parsed);
          safeStorage.setItem(STORE_THEME_KEY, JSON.stringify(parsed));
        }
      }
    } catch {}
  }, [parseThemeFromData]);

  useEffect(() => {
    let isMounted = true;
    const fetchTheme = async () => {
      if (isMounted) {
        await loadStoreTheme();
      }
    };
    fetchTheme();
    return () => {
      isMounted = false;
    };
  }, [loadStoreTheme]);

  // Sync theme when owner app is brought back to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadStoreTheme();
      }
    });
    return () => {
      sub.remove();
    };
  }, [loadStoreTheme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      safeStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const isDark = theme === 'dark';

  const colors = useMemo(() => {
    const base = { ...(isDark ? DARK_COLORS : LIGHT_COLORS) };
    if (storeTheme?.applyToOwner && storeTheme.primary) {
      base.primary = storeTheme.primary;
      base.primaryDark = storeTheme.primaryDark || base.primaryDark;
      if (storeTheme.accent) {
        base.accent = storeTheme.accent;
      }
      if (storeTheme.secondary) {
        base.indigo = storeTheme.secondary;
        base.secondary = storeTheme.secondary;
      }
    }

    return base;
  }, [isDark, storeTheme]);

  useEffect(() => {
    // Synchronize static globalTheme for any components that import it directly
    globalTheme.colors.primary = colors.primary as HexColor;
    globalTheme.colors.primaryDark = colors.primaryDark as HexColor;
    globalTheme.colors.indigo = colors.indigo as HexColor;
    if (colors.accent) globalTheme.colors.accent = colors.accent as HexColor;
    if (colors.secondary) globalTheme.colors.secondary = colors.secondary as HexColor;
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors, refreshTheme: loadStoreTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
